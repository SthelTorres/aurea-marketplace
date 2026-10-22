import type { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { announce, setRealtimeBanner } from '@/lib/announce'
import { getGuestId, TOKEN_STORAGE_KEY } from '@/lib/api-client'
import { forgetPendingOrder, rememberPendingOrder } from '@/lib/pending-order'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import type { Cart, Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, PaginatedResult } from '@/shared/types'

export type SocketStatus = 'connecting' | 'connected' | 'reconnecting'

let status: SocketStatus = 'connecting'
let activeSocket: Socket | null = null
const statusListeners = new Set<() => void>()

function setStatus(next: SocketStatus): void {
  status = next
  statusListeners.forEach((listener) => listener())
}

export function getSocketStatus(): SocketStatus {
  return status
}

export function subscribeSocketStatus(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

function remember(seen: Set<string>, id: string): boolean {
  if (seen.has(id)) return false
  seen.add(id)
  if (seen.size > 300) {
    const oldest = seen.values().next().value
    if (oldest) seen.delete(oldest)
  }
  return true
}

function patchCatalogs(nft: Nft): void {
  queryClient.setQueriesData<PaginatedResult<Nft>>({ queryKey: queryKeys.catalogs }, (current) => {
    if (!current?.data.some((item) => item.id === nft.id)) return current
    return {
      ...current,
      data: current.data.map((item) => (item.id === nft.id && nft.version > item.version ? nft : item)),
    }
  })
}

function patchCarts(nft: Nft): boolean {
  let affected = false
  const patch = (current: Cart | undefined): Cart | undefined => {
    if (!current?.items.some((item) => item.nftId === nft.id)) return current
    affected = true
    return {
      ...current,
      items: current.items.map((item) => {
        if (item.nftId !== nft.id) return item
        const edition = nft.editions.find((entry) => entry.id === item.editionId)
        if (!edition || nft.version <= item.nftVersion) return item
        return {
          ...item,
          name: nft.name,
          image: nft.imageUrl,
          editionLabel: edition.label,
          unitPriceEth: edition.priceEth,
          available: edition.stock,
          nftVersion: nft.version,
        }
      }),
    }
  }
  queryClient.setQueriesData<Cart>({ predicate: (query) => query.queryKey.at(-1) === 'cart' }, patch)
  return affected
}

function nftMessage(previous: Nft | undefined, nft: Nft): string | null {
  if (!previous) return null
  const soldOut = previous.stock > 0 && nft.stock === 0
  if (soldOut) return `${nft.name} esgotou`
  const priceChanged = previous.editions.some((edition) => {
    const next = nft.editions.find((item) => item.id === edition.id)
    return next !== undefined && next.priceEth !== edition.priceEth
  })
  if (priceChanged || previous.priceEth !== nft.priceEth) {
    return `O preço de ${nft.name} mudou de ${previous.priceEth} para ${nft.priceEth} ETH`
  }
  const editionSold = previous.editions.find((edition) => {
    const next = nft.editions.find((item) => item.id === edition.id)
    return edition.stock > 0 && next !== undefined && next.stock === 0
  })
  if (editionSold) return `${nft.name} — ${editionSold.label} esgotou`
  return `${nft.name} foi atualizado`
}

function previousNft(nftId: string): Nft | undefined {
  const detail = queryClient.getQueryData<Nft>(queryKeys.nft(nftId))
  if (detail) return detail
  const catalogs = queryClient.getQueriesData<PaginatedResult<Nft>>({ queryKey: queryKeys.catalogs })
  for (const [, page] of catalogs) {
    const found = page?.data.find((item) => item.id === nftId)
    if (found) return found
  }
  return undefined
}

function knownNftVersion(nftId: string): number {
  let version = previousNft(nftId)?.version ?? 0
  const carts = queryClient.getQueriesData<Cart>({ predicate: (query) => query.queryKey.at(-1) === 'cart' })
  for (const [, cart] of carts) {
    for (const item of cart?.items ?? []) {
      if (item.nftId === nftId) version = Math.max(version, item.nftVersion)
    }
  }
  return version
}

function applyNft(event: NftUpdatedEvent, seen: Set<string>): void {
  if (!event?.id || event.type !== 'nft.updated' || !event.data) return
  if (!remember(seen, event.id)) return
  const nft = event.data
  if (event.version !== nft.version || event.version <= knownNftVersion(nft.id)) return
  const previous = previousNft(nft.id)
  queryClient.setQueryData<Nft>(queryKeys.nft(nft.id), (current) => (!current || nft.version > current.version ? nft : current))
  patchCatalogs(nft)
  const affected = patchCarts(nft)
  const guestId = getGuestId()
  void queryClient.invalidateQueries({ queryKey: ['guest', guestId, 'quote'] })
  void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'user' && query.queryKey[2] === 'quote' })
  void queryClient.invalidateQueries({ predicate: (query) => query.queryKey.at(-1) === 'cart' })
  const message = nftMessage(previous, nft)
  if (!message) return
  if (affected) setRealtimeBanner(message)
  announce(message)
  toast.info(message)
}

function applyOrder(event: OrderUpdatedEvent, seen: Set<string>, userId: string | null): void {
  if (!event?.id || event.type !== 'order.updated' || !event.data) return
  if (!remember(seen, event.id)) return
  const order = event.data
  if (userId && order.userId !== userId) return
  const key = queryKeys.order(order.userId, order.id)
  const current = queryClient.getQueryData<Order>(key)
  if (current && (current.status === 'confirmed' || current.status === 'refused')) return
  if (event.version <= (current?.version ?? 0)) return
  queryClient.setQueryData<Order>(key, order)
  if (order.status === 'pending') rememberPendingOrder(order.userId, order.id)
  if (order.status === 'confirmed' || order.status === 'refused') {
    forgetPendingOrder(order.userId)
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart({ type: 'user', id: order.userId }) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalogs })
  }
  const message = order.status === 'confirmed'
    ? 'Pagamento confirmado.'
    : order.status === 'refused'
      ? 'Pagamento recusado.'
      : 'Pagamento pendente.'
  announce(message)
  toast.info(message)
}

function reconcile(userId: string | null): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.catalogs })
  void queryClient.invalidateQueries({ queryKey: ['nft'] })
  const guestId = getGuestId()
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart({ type: 'user', id: userId }) })
    void queryClient.invalidateQueries({ queryKey: ['user', userId, 'quote'] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders(userId) })
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart({ type: 'guest', id: guestId }) })
  void queryClient.invalidateQueries({ queryKey: ['guest', guestId, 'quote'] })
}

export async function openSocket(userId: string | null): Promise<Socket> {
  const { io } = await import('socket.io-client')
  const socket = io(window.location.origin, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 2_000,
  })
  activeSocket = socket
  const seen = new Set<string>()
  let disconnected = false

  const join = () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (token && userId) socket.emit('session.join', { token })
  }

  socket.on('connect', () => {
    join()
    setStatus('connected')
    if (disconnected) {
      disconnected = false
      reconcile(userId)
    }
  })
  socket.on('disconnect', () => {
    disconnected = true
    setStatus('reconnecting')
  })
  socket.on('connect_error', () => setStatus('reconnecting'))
  socket.on('nft.updated', (event: NftUpdatedEvent) => applyNft(event, seen))
  socket.on('order.updated', (event: OrderUpdatedEvent) => applyOrder(event, seen, userId))

  setStatus('connecting')
  socket.connect()
  return socket
}

export function closeSocket(socket: Socket): void {
  socket.emit('session.leave')
  socket.removeAllListeners()
  socket.disconnect()
  if (activeSocket === socket) activeSocket = null
}

export function destroyActiveSocket(): void {
  if (activeSocket) closeSocket(activeSocket)
}

export function leaveSession(): void {
  activeSocket?.emit('session.leave')
}
