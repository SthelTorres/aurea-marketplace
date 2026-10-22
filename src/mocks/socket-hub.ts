import { toSocketIo } from '@mswjs/socket.io-binding'
import type { WebSocketHandlerConnection } from 'msw'
import type { Order, RealtimeEvent } from '@/shared/types'
import { mirrorClient } from './socket-relay'
import { store } from './store'

interface ActiveConnection {
  io: ReturnType<typeof toSocketIo>
  userId: string | null
}

const connections = new Map<object, ActiveConnection>()

function readToken(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || !('token' in payload)) return undefined
  const token = (payload as { token?: unknown }).token
  return typeof token === 'string' ? token : undefined
}

export function attachConnection(connection: WebSocketHandlerConnection): void {
  if (store.isSocketBlocked()) {
    connection.client.close()
    return
  }

  mirrorClient(connection.client)
  const io = toSocketIo(connection)
  const entry: ActiveConnection = { io, userId: null }
  connections.set(connection.client, entry)

  io.client.on('session.join', (_message, payload: unknown) => {
    const session = store.getSessionFromToken(readToken(payload))
    entry.userId = session?.user.id ?? null
  })

  io.client.on('session.leave', () => {
    entry.userId = null
  })

  connection.client.addEventListener('message', (event) => {
    if (event.data === '2') connection.client.send('3')
  })

  connection.client.addEventListener('close', () => {
    connections.delete(connection.client)
  })
}

export function broadcast(event: RealtimeEvent): void {
  for (const entry of connections.values()) {
    if (event.type === 'order.updated' && entry.userId !== (event.data as Order).userId) continue
    entry.io.client.emit(event.type, event)
  }
}

export function disconnectAll(): { ok: true } {
  store.setSocketBlocked(true)
  for (const client of [...connections.keys()]) {
    connections.delete(client)
    try {
      ;(client as { close: () => void }).close()
    } catch {
      /* conexão já encerrada */
    }
  }
  return { ok: true }
}

export function restoreSockets(): { ok: true } {
  store.setSocketBlocked(false)
  return { ok: true }
}

store.onRealtime(broadcast)
