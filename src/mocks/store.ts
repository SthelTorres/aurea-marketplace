import { seedCoupons, seedNfts, seedUsers, seedWallets, type SeedUser } from '@/mocks/fixtures'
import { DB_KEY, SCENARIO_KEY, SEED_KEY } from '@/mocks/keys'
import { addEth, ethEqual, formatEth, minEth, multiplyEthByInt, NETWORK_FEES, parseEth, percentOfEth, subtractEth } from '@/shared/money'
import { hashBody, hashPassword } from '@/shared/password'
import { nextUnit } from '@/shared/prng'
import type {
  ApiErrorDetails, Cart, CartItem, CatalogFilters, Coupon, CreateOrderBody, Favorite, LineSnapshot,
  Network, Nft, NftUpdatedEvent, Order, OrderStatus, OrderUpdatedEvent, OwnerRef, PaginatedResult, Quote,
  QuoteItem, RealtimeEvent, Scenario, Session, User, Wallet, WalletRole,
} from '@/shared/types'
import { SCENARIOS } from '@/shared/types'

export { DB_KEY, SCENARIO_KEY, SEED_KEY } from '@/mocks/keys'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADDRESS = /^0x[a-fA-F0-9]{40}$/

interface IdempotencyRecord {
  orderId: string
  bodyHash: string
}

interface MockState {
  users: SeedUser[]
  sessions: Session[]
  nfts: Nft[]
  favorites: Favorite[]
  carts: Cart[]
  coupons: Coupon[]
  quotes: Quote[]
  orders: Order[]
  wallets: Wallet[]
  idempotency: Record<string, IdempotencyRecord>
  counters: { id: number; event: number; quote: number }
  flags: { priceShocked: boolean }
  prngSeed: number
  prngState: number
  socketBlocked: boolean
}

export class StoreError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ApiErrorDetails

  constructor(message: string, status = 400, code = 'BAD_REQUEST', details?: ApiErrorDetails) {
    super(message)
    this.name = 'StoreError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function validation(fields: Record<string, string>, message = 'Revise os campos destacados.'): StoreError {
  return new StoreError(message, 422, 'VALIDATION_ERROR', { fields })
}

function passwordError(password: string): string | null {
  if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.'
  if (!/[A-Za-z]/.test(password)) return 'A senha deve conter ao menos uma letra.'
  if (!/\d/.test(password)) return 'A senha deve conter ao menos um número.'
  return null
}

function dataUrlBytes(value: string): number {
  if (!value.startsWith('data:')) return value.length
  const base64 = value.slice(value.indexOf(',') + 1).replace(/=+$/, '')
  return Math.floor(base64.length * 0.75)
}

function publicUser(user: SeedUser): User {
  const safe: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
  if (user.avatarUrl) safe.avatarUrl = user.avatarUrl
  return safe
}

function readSeed(): number {
  if (typeof localStorage === 'undefined') return 42
  const raw = localStorage.getItem(SEED_KEY)
  const parsed = raw === null ? 42 : Number(raw)
  return Number.isFinite(parsed) ? parsed : 42
}

function initialState(): MockState {
  const seed = readSeed()
  return {
    users: clone(seedUsers),
    sessions: [],
    nfts: clone(seedNfts),
    favorites: [],
    carts: [],
    coupons: clone(seedCoupons),
    quotes: [],
    orders: [],
    wallets: clone(seedWallets),
    idempotency: {},
    counters: { id: 1000, event: 0, quote: 0 },
    flags: { priceShocked: false },
    prngSeed: seed,
    prngState: seed >>> 0,
    socketBlocked: false,
  }
}

function isState(value: unknown): value is MockState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<MockState>
  return Boolean(
    state.nfts && state.nfts.length >= 24 && state.nfts[0]?.images?.length === 3
    && state.users && state.users.length >= 2
    && state.counters && state.flags && state.wallets?.some((wallet) => wallet.role === 'secondary')
    && state.idempotency && Array.isArray(state.orders) && Array.isArray(state.carts),
  )
}

class MockStore {
  private state: MockState = this.load()
  private listeners = new Set<(event: RealtimeEvent) => void>()
  private lastEvent: RealtimeEvent | null = null

  private load(): MockState {
    try {
      const raw = localStorage.getItem(DB_KEY)
      if (!raw) return initialState()
      const parsed: unknown = JSON.parse(raw)
      return isState(parsed) ? parsed : initialState()
    } catch {
      return initialState()
    }
  }

  private save(): void {
    localStorage.setItem(DB_KEY, JSON.stringify(this.state))
  }

  private timestamp(): string {
    return new Date().toISOString()
  }

  private nextId(prefix: string): string {
    this.state.counters.id += 1
    return `${prefix}-${String(this.state.counters.id).padStart(6, '0')}`
  }

  private nextEventId(): string {
    this.state.counters.event += 1
    this.save()
    return `evt-${String(this.state.counters.event).padStart(6, '0')}`
  }

  reset(): { ok: true } {
    localStorage.setItem(SCENARIO_KEY, 'default')
    this.state = initialState()
    this.lastEvent = null
    this.save()
    return { ok: true }
  }

  getScenario(): Scenario {
    const value = localStorage.getItem(SCENARIO_KEY)
    return SCENARIOS.includes(value as Scenario) ? value as Scenario : 'default'
  }

  setScenario(scenario: Scenario): Scenario {
    localStorage.setItem(SCENARIO_KEY, scenario)
    return scenario
  }

  randomDelay(): number {
    const seed = readSeed()
    if (this.state.prngSeed !== seed) {
      this.state.prngSeed = seed
      this.state.prngState = seed >>> 0
    }
    const box = { value: this.state.prngState >>> 0 }
    const unit = nextUnit(box)
    this.state.prngState = box.value
    this.save()
    return 100 + Math.floor(unit * 1101)
  }

  isSocketBlocked(): boolean {
    return this.state.socketBlocked
  }

  setSocketBlocked(blocked: boolean): void {
    this.state.socketBlocked = blocked
    this.save()
  }

  onRealtime(listener: (event: RealtimeEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private publish(event: RealtimeEvent): void {
    this.lastEvent = clone(event)
    for (const listener of this.listeners) listener(clone(event))
  }

  replayLast(): RealtimeEvent {
    if (!this.lastEvent) throw new StoreError('Nenhum evento para reproduzir.', 404, 'EVENT_NOT_FOUND')
    const event = clone(this.lastEvent)
    for (const listener of this.listeners) listener(clone(event))
    return event
  }

  emitStaleNft(nftId: string): NftUpdatedEvent {
    const nft = clone(this.nftOrThrow(nftId))
    const version = Math.max(0, nft.version - 1)
    nft.version = version
    nft.priceEth = '9.9999'
    const first = nft.editions[0]
    if (first) first.priceEth = '9.9999'
    const event: NftUpdatedEvent = {
      id: this.nextEventId(),
      type: 'nft.updated',
      resourceId: nft.id,
      version,
      occurredAt: this.timestamp(),
      data: nft,
    }
    this.save()
    this.publish(event)
    return event
  }

  getSessionFromToken(token?: string | null): Session | undefined {
    if (!token) return undefined
    const session = this.state.sessions.find((item) => item.token === token)
    if (!session) return undefined
    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.expireToken(token)
      return undefined
    }
    return clone(session)
  }

  expireToken(token?: string | null): void {
    this.state.sessions = token
      ? this.state.sessions.filter((session) => session.token !== token)
      : []
    this.save()
  }

  login(email: string, password: string, guestId?: string): Session {
    const user = this.state.users.find((item) => item.email === email.trim().toLowerCase())
    if (!user || user.passwordHash !== hashPassword(password)) {
      throw new StoreError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS')
    }
    const session: Session = {
      token: this.nextId('token'),
      user: publicUser(user),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }
    this.state.sessions.push(session)
    if (guestId) this.mergeGuestCart(guestId, user.id)
    this.save()
    return clone(session)
  }

  register(input: { name?: string; email?: string; password?: string }, guestId?: string): Session {
    const fields: Record<string, string> = {}
    const name = input.name?.trim() ?? ''
    const email = input.email?.trim().toLowerCase() ?? ''
    const password = input.password ?? ''
    if (name.length < 2) fields.name = 'Informe seu nome.'
    if (!EMAIL.test(email)) fields.email = 'Informe um e-mail válido.'
    const passwordMessage = passwordError(password)
    if (passwordMessage) fields.password = passwordMessage
    if (Object.keys(fields).length > 0) throw validation(fields)
    if (this.state.users.some((user) => user.email === email)) {
      throw new StoreError('Este e-mail já está cadastrado.', 409, 'EMAIL_TAKEN', {
        fields: { email: 'Este e-mail já está cadastrado.' },
      })
    }
    const timestamp = this.timestamp()
    this.state.users.push({
      id: this.nextId('user'),
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    this.save()
    return this.login(email, password, guestId)
  }

  logout(token?: string | null): void {
    this.expireToken(token)
  }

  listNfts(filters: CatalogFilters = {}): PaginatedResult<Nft> {
    let items = [...this.state.nfts]
    if (filters.q) {
      const query = filters.q.toLocaleLowerCase('pt-BR')
      items = items.filter((nft) =>
        nft.name.toLocaleLowerCase('pt-BR').includes(query)
        || nft.description.toLocaleLowerCase('pt-BR').includes(query)
        || nft.creator.toLocaleLowerCase('pt-BR').includes(query))
    }
    if (filters.category) items = items.filter((nft) => nft.category === filters.category)
    const min = this.priceBound(filters.minPrice, 'minPrice')
    const max = this.priceBound(filters.maxPrice, 'maxPrice')
    if (min !== undefined) items = items.filter((nft) => parseEth(nft.priceEth) >= min)
    if (max !== undefined) items = items.filter((nft) => parseEth(nft.priceEth) <= max)
    const sort = filters.sort ?? 'newest'
    items.sort((a, b) => {
      if (sort === 'price_asc' || sort === 'price_desc') {
        const delta = parseEth(a.priceEth) < parseEth(b.priceEth) ? -1 : parseEth(a.priceEth) > parseEth(b.priceEth) ? 1 : 0
        return sort === 'price_asc' ? delta || a.id.localeCompare(b.id) : -delta || a.id.localeCompare(b.id)
      }
      if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id)
      return Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id)
    })
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12))
    const total = items.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    return {
      data: clone(items.slice((page - 1) * pageSize, page * pageSize)),
      pagination: { page, pageSize, total, totalPages },
    }
  }

  getNft(nftId: string): Nft {
    return clone(this.nftOrThrow(nftId))
  }

  listFavorites(userId: string): Favorite[] {
    return this.state.favorites
      .filter((favorite) => favorite.userId === userId)
      .map((favorite) => clone({ ...favorite, nft: this.state.nfts.find((nft) => nft.id === favorite.nftId) }))
  }

  addFavorite(userId: string, nftId: string): Favorite {
    this.nftOrThrow(nftId)
    const existing = this.state.favorites.find((item) => item.userId === userId && item.nftId === nftId)
    if (existing) return clone({ ...existing, nft: this.nftOrThrow(nftId) })
    const favorite: Favorite = { id: this.nextId('favorite'), userId, nftId, createdAt: this.timestamp() }
    this.state.favorites.push(favorite)
    this.save()
    return clone({ ...favorite, nft: this.nftOrThrow(nftId) })
  }

  removeFavorite(userId: string, nftId: string): void {
    this.state.favorites = this.state.favorites.filter((favorite) => favorite.userId !== userId || favorite.nftId !== nftId)
    this.save()
  }

  getCart(owner: OwnerRef): Cart {
    return this.presentCart(this.findCart(owner))
  }

  addCartItem(owner: OwnerRef, input: { nftId?: string; editionId?: string; quantity?: number }): Cart {
    if (!input.nftId || !input.editionId) throw validation({ editionId: 'Selecione uma edição.' })
    const quantity = input.quantity === undefined ? 1 : this.parseQuantity(input.quantity)
    if (quantity < 1) throw validation({ quantity: 'A quantidade mínima é 1.' })
    const { nft, edition } = this.editionOrThrow(input.nftId, input.editionId)
    const cart = this.findCart(owner)
    const existing = cart.items.find((item) => item.editionId === edition.id)
    const nextQuantity = quantity + (existing?.quantity ?? 0)
    if (nextQuantity > edition.stock) this.stockError(edition.stock)
    if (existing) existing.quantity = nextQuantity
    else cart.items.push(this.lineFromEdition(nft, edition, quantity))
    this.touchCart(cart)
    this.save()
    return this.presentCart(cart)
  }

  updateCartItem(owner: OwnerRef, itemId: string, quantity: number): Cart {
    const parsed = this.parseQuantity(quantity)
    if (parsed < 1) throw validation({ quantity: 'A quantidade mínima é 1.' })
    const cart = this.findCart(owner)
    const item = cart.items.find((entry) => entry.id === itemId)
    if (!item) throw new StoreError('Item do carrinho não encontrado.', 404, 'CART_ITEM_NOT_FOUND')
    const { edition } = this.editionOrThrow(item.nftId, item.editionId)
    if (parsed > edition.stock) this.stockError(edition.stock)
    item.quantity = parsed
    this.touchCart(cart)
    this.save()
    return this.presentCart(cart)
  }

  removeCartItem(owner: OwnerRef, itemId: string): Cart {
    const cart = this.findCart(owner)
    if (!cart.items.some((item) => item.id === itemId)) {
      throw new StoreError('Item do carrinho não encontrado.', 404, 'CART_ITEM_NOT_FOUND')
    }
    cart.items = cart.items.filter((item) => item.id !== itemId)
    if (cart.items.length === 0) delete cart.couponCode
    this.touchCart(cart)
    this.save()
    return this.presentCart(cart)
  }

  applyCoupon(owner: OwnerRef, code: string): Cart {
    const normalized = code.trim().toUpperCase()
    if (!normalized) throw validation({ code: 'Informe um cupom.' }, 'Informe um cupom.')
    const coupon = this.state.coupons.find((item) => item.code === normalized)
    if (!coupon || !coupon.active) {
      throw new StoreError('Cupom inválido.', 404, 'COUPON_INVALID', { fields: { code: 'Cupom inválido.' } })
    }
    if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= Date.now()) {
      throw new StoreError('Este cupom está expirado.', 422, 'COUPON_EXPIRED', {
        fields: { code: 'Este cupom está expirado.' },
      })
    }
    const cart = this.findCart(owner)
    cart.couponCode = coupon.code
    this.touchCart(cart)
    this.save()
    return this.presentCart(cart)
  }

  removeCoupon(owner: OwnerRef): Cart {
    const cart = this.findCart(owner)
    delete cart.couponCode
    this.touchCart(cart)
    this.save()
    return this.presentCart(cart)
  }

  quoteCart(owner: OwnerRef, network: Network = 'ethereum'): Quote {
    return this.computeQuote(owner, network, true)
  }

  createOrder(userId: string, idempotencyKey: string, body: CreateOrderBody): { order: Order; timeout: boolean } {
    if (!idempotencyKey.trim()) {
      throw new StoreError('O cabeçalho Idempotency-Key é obrigatório.', 400, 'IDEMPOTENCY_KEY_REQUIRED')
    }
    const bodyHash = hashBody(body)
    const recordKey = `${userId}:${idempotencyKey}`
    const existing = this.state.idempotency[recordKey]
    if (existing) {
      if (existing.bodyHash !== bodyHash) {
        throw new StoreError('Esta chave de idempotência já foi usada com outro pedido.', 409, 'IDEMPOTENCY_CONFLICT')
      }
      return { order: this.getOrder(userId, existing.orderId), timeout: false }
    }

    this.assertOrderBody(body)
    const cart = this.findCart({ id: userId, type: 'user' })
    const quote = this.state.quotes.find((item) => item.id === body.quoteId && item.cartId === cart.id)
    if (!quote) throw new StoreError('Cotação não encontrada.', 404, 'QUOTE_NOT_FOUND')

    this.applyPurchaseShocks(cart)
    this.assertStock(cart)

    const fresh = this.computeQuote({ id: userId, type: 'user' }, body.network, false)
    if (!this.quotesMatch(quote, fresh)) {
      const replacement = this.computeQuote({ id: userId, type: 'user' }, body.network, true)
      throw new StoreError('A cotação mudou. Aceite os novos valores para continuar.', 409, 'QUOTE_CHANGED', {
        quote: replacement,
      })
    }

    const wallet = this.state.wallets.find((item) => item.id === body.walletId && item.userId === userId)
    if (!wallet) throw new StoreError('Carteira não encontrada.', 404, 'WALLET_NOT_FOUND')
    if (!wallet.connected) {
      throw validation({ walletId: 'Conecte a carteira antes de confirmar.' })
    }

    const scenario = this.getScenario()
    const timeout = scenario === 'payment-timeout'
    const status: OrderStatus = scenario === 'payment-refuse' ? 'refused' : timeout ? 'pending' : 'confirmed'
    const timestamp = this.timestamp()
    const order: Order = {
      id: this.nextId('order'),
      userId,
      quoteId: quote.id,
      items: quote.items.map((item) => this.freezeLine(item)),
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      network: quote.network,
      walletId: wallet.id,
      walletAddress: wallet.address,
      collector: { name: body.collector.name.trim(), email: body.collector.email.trim().toLowerCase() },
      status,
      idempotencyKey,
      version: 1,
      stockApplied: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    if (quote.couponCode) order.couponCode = quote.couponCode
    if (status === 'confirmed') {
      order.txHash = this.txHash(order.id)
      order.explorerUrl = this.explorer(order.network, order.txHash)
    }
    if (status === 'pending') order.autoConfirmAt = new Date(Date.now() + 3_000).toISOString()

    this.state.orders.push(order)
    this.state.idempotency[recordKey] = { orderId: order.id, bodyHash }
    if (status === 'confirmed') this.applyConfirmedOrder(order)
    this.save()
    this.emitOrder(order)
    if (order.autoConfirmAt) {
      const wait = Math.max(0, Date.parse(order.autoConfirmAt) - Date.now())
      globalThis.setTimeout(() => {
        const current = this.state.orders.find((item) => item.id === order.id)
        if (current?.status === 'pending') this.confirmPending(order.id)
      }, wait)
    }
    return { order: clone(order), timeout }
  }

  getOrder(userId: string, orderId: string): Order {
    const order = this.state.orders.find((item) => item.id === orderId && item.userId === userId)
    if (!order) throw new StoreError('Pedido não encontrado.', 404, 'ORDER_NOT_FOUND')
    if (order.status === 'pending' && order.autoConfirmAt && Date.now() >= Date.parse(order.autoConfirmAt)) {
      return this.confirmPending(order.id)
    }
    return clone(order)
  }

  getProfile(userId: string): User {
    return publicUser(this.userOrThrow(userId))
  }

  updateProfile(userId: string, changes: { name?: string; email?: string; avatarUrl?: string }): User {
    const user = this.userOrThrow(userId)
    const fields: Record<string, string> = {}
    if (changes.name !== undefined && changes.name.trim().length < 2) {
      fields.name = 'Informe um nome com pelo menos 2 caracteres.'
    }
    if (changes.email !== undefined && !EMAIL.test(changes.email.trim())) {
      fields.email = 'Informe um e-mail válido.'
    }
    if (changes.avatarUrl) {
      const allowed = changes.avatarUrl.startsWith('data:image/') || changes.avatarUrl.startsWith('/')
      if (!allowed) fields.avatarUrl = 'Envie uma imagem válida.'
      else if (dataUrlBytes(changes.avatarUrl) > 300 * 1024) fields.avatarUrl = 'A imagem deve ter no máximo 300 KB.'
    }
    if (Object.keys(fields).length > 0) throw validation(fields)
    if (changes.email) {
      const email = changes.email.trim().toLowerCase()
      if (this.state.users.some((item) => item.id !== userId && item.email === email)) {
        throw new StoreError('Este e-mail já está em uso.', 409, 'EMAIL_TAKEN', {
          fields: { email: 'Este e-mail já está em uso.' },
        })
      }
      user.email = email
    }
    if (changes.name !== undefined) user.name = changes.name.trim()
    if (changes.avatarUrl === '') delete user.avatarUrl
    else if (changes.avatarUrl) user.avatarUrl = changes.avatarUrl
    user.updatedAt = this.timestamp()
    this.state.sessions.forEach((session) => {
      if (session.user.id === user.id) session.user = publicUser(user)
    })
    this.save()
    return publicUser(user)
  }

  changePassword(userId: string, currentPassword: string, newPassword: string): { message: string } {
    const user = this.userOrThrow(userId)
    if (user.passwordHash !== hashPassword(currentPassword ?? '')) {
      throw validation({ currentPassword: 'A senha atual está incorreta.' })
    }
    const message = passwordError(newPassword ?? '')
    if (message) throw validation({ newPassword: message })
    user.passwordHash = hashPassword(newPassword)
    user.updatedAt = this.timestamp()
    this.save()
    return { message: 'Senha alterada com sucesso.' }
  }

  listWallets(userId: string): Wallet[] {
    return clone(this.state.wallets.filter((wallet) => wallet.userId === userId))
  }

  createWallet(userId: string, input: { label?: string; address?: string; role?: WalletRole }): Wallet {
    const fields: Record<string, string> = {}
    const label = input.label?.trim() ?? ''
    const address = input.address?.trim() ?? ''
    if (label.length < 2) fields.label = 'Informe um nome para a carteira.'
    if (!ADDRESS.test(address)) fields.address = 'Informe um endereço 0x com 40 caracteres hexadecimais.'
    if (input.role !== 'primary' && input.role !== 'secondary') fields.role = 'Escolha a carteira principal ou secundária.'
    if (Object.keys(fields).length > 0) throw validation(fields)
    if (this.state.wallets.some((wallet) => wallet.userId === userId && wallet.address.toLowerCase() === address.toLowerCase())) {
      throw new StoreError('Esta carteira já foi cadastrada.', 409, 'WALLET_EXISTS')
    }
    if (this.state.wallets.some((wallet) => wallet.userId === userId && wallet.role === input.role)) {
      throw new StoreError('Já existe uma carteira neste espaço.', 409, 'WALLET_ROLE_TAKEN')
    }
    const timestamp = this.timestamp()
    const wallet: Wallet = {
      id: this.nextId('wallet'),
      userId,
      label,
      address,
      role: input.role ?? 'primary',
      connected: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    this.state.wallets.push(wallet)
    this.save()
    return clone(wallet)
  }

  updateWallet(userId: string, walletId: string, changes: { label?: string; address?: string }): Wallet {
    const wallet = this.state.wallets.find((item) => item.id === walletId && item.userId === userId)
    if (!wallet) throw new StoreError('Carteira não encontrada.', 404, 'WALLET_NOT_FOUND')
    const fields: Record<string, string> = {}
    if (changes.label !== undefined && changes.label.trim().length < 2) fields.label = 'Informe um nome para a carteira.'
    if (changes.address !== undefined && !ADDRESS.test(changes.address.trim())) {
      fields.address = 'Informe um endereço 0x com 40 caracteres hexadecimais.'
    }
    if (Object.keys(fields).length > 0) throw validation(fields)
    if (changes.address) {
      const address = changes.address.trim()
      const duplicate = this.state.wallets.some((item) =>
        item.userId === userId && item.id !== walletId && item.address.toLowerCase() === address.toLowerCase())
      if (duplicate) throw new StoreError('Esta carteira já foi cadastrada.', 409, 'WALLET_EXISTS')
      wallet.address = address
    }
    if (changes.label !== undefined) wallet.label = changes.label.trim()
    wallet.updatedAt = this.timestamp()
    this.save()
    return clone(wallet)
  }

  connectWallet(userId: string, walletId: string): Wallet {
    const wallet = this.walletOrThrow(userId, walletId)
    if (this.getScenario() === 'wallet-refuse') {
      throw new StoreError('A conexão da carteira foi recusada.', 403, 'WALLET_REJECTED')
    }
    wallet.connected = true
    wallet.updatedAt = this.timestamp()
    this.save()
    return clone(wallet)
  }

  disconnectWallet(userId: string, walletId: string): Wallet {
    const wallet = this.walletOrThrow(userId, walletId)
    wallet.connected = false
    wallet.updatedAt = this.timestamp()
    this.save()
    return clone(wallet)
  }

  updateNftForDev(input: { nftId?: string; editionId?: string; priceEth?: string; stock?: number }): Nft {
    if (!input.nftId) throw validation({ nftId: 'Informe o NFT.' })
    const nft = this.nftOrThrow(input.nftId)
    const edition = input.editionId
      ? nft.editions.find((item) => item.id === input.editionId)
      : nft.editions[0]
    if (!edition) throw new StoreError('Edição não encontrada.', 404, 'EDITION_NOT_FOUND')
    if (input.priceEth !== undefined) edition.priceEth = formatEth(parseEth(input.priceEth))
    if (input.stock !== undefined) {
      if (!Number.isInteger(input.stock) || input.stock < 0) {
        throw validation({ stock: 'Informe um estoque inteiro maior ou igual a zero.' })
      }
      edition.stock = input.stock
    }
    this.refreshAggregates(nft)
    nft.version += 1
    nft.updatedAt = this.timestamp()
    this.save()
    this.emitNft(nft)
    return clone(nft)
  }

  emitOrderUpdate(orderId: string, status?: OrderStatus): Order {
    const order = this.state.orders.find((item) => item.id === orderId)
    if (!order) throw new StoreError('Pedido não encontrado.', 404, 'ORDER_NOT_FOUND')
    if (status && status !== order.status) {
      order.status = status
      if (status === 'confirmed') {
        order.txHash = order.txHash ?? this.txHash(order.id)
        order.explorerUrl = order.explorerUrl ?? this.explorer(order.network, order.txHash)
        this.applyConfirmedOrder(order)
      }
    }
    order.version += 1
    order.updatedAt = this.timestamp()
    this.save()
    this.emitOrder(order)
    return clone(order)
  }

  private confirmPending(orderId: string): Order {
    const order = this.state.orders.find((item) => item.id === orderId)
    if (!order) throw new StoreError('Pedido não encontrado.', 404, 'ORDER_NOT_FOUND')
    if (order.status !== 'pending') return clone(order)
    order.status = 'confirmed'
    order.version += 1
    order.updatedAt = this.timestamp()
    order.txHash = order.txHash ?? this.txHash(order.id)
    order.explorerUrl = this.explorer(order.network, order.txHash)
    delete order.autoConfirmAt
    this.applyConfirmedOrder(order)
    this.save()
    this.emitOrder(order)
    return clone(order)
  }

  private applyPurchaseShocks(cart: Cart): void {
    const scenario = this.getScenario()
    const first = cart.items[0]
    if (!first) return
    if (scenario === 'price-change' && !this.state.flags.priceShocked) {
      const { nft, edition } = this.editionOrThrow(first.nftId, first.editionId)
      edition.priceEth = formatEth(parseEth(edition.priceEth) + parseEth('0.01'))
      this.refreshAggregates(nft)
      nft.version += 1
      nft.updatedAt = this.timestamp()
      this.state.flags.priceShocked = true
      this.save()
      this.emitNft(nft)
    }
    if (scenario === 'sold-out') {
      const { nft, edition } = this.editionOrThrow(first.nftId, first.editionId)
      if (edition.stock !== 0) {
        edition.stock = 0
        this.refreshAggregates(nft)
        nft.version += 1
        nft.updatedAt = this.timestamp()
        this.save()
        this.emitNft(nft)
      }
    }
  }

  private assertStock(cart: Cart): void {
    for (const item of cart.items) {
      const { edition } = this.editionOrThrow(item.nftId, item.editionId)
      if (item.quantity > edition.stock) this.stockError(edition.stock)
    }
  }

  private stockError(available: number): never {
    throw new StoreError('A edição não tem estoque suficiente.', 409, 'OUT_OF_STOCK', {
      available,
      fields: { quantity: `Máximo disponível: ${available}` },
    })
  }

  private assertOrderBody(body: CreateOrderBody): void {
    const fields: Record<string, string> = {}
    if (!body.quoteId) fields.quoteId = 'A cotação é obrigatória.'
    if (body.network !== 'ethereum' && body.network !== 'polygon') fields.network = 'Selecione a rede.'
    if (!body.walletId) fields.walletId = 'Selecione uma carteira.'
    if (!body.collector?.name || body.collector.name.trim().length < 2) fields.name = 'Informe o nome completo.'
    if (!EMAIL.test(body.collector?.email?.trim() ?? '')) fields.email = 'Informe um e-mail válido.'
    if (Object.keys(fields).length > 0) throw validation(fields)
  }

  private quotesMatch(stored: Quote, fresh: Quote): boolean {
    if (stored.network !== fresh.network) return false
    if ((stored.couponCode ?? '') !== (fresh.couponCode ?? '')) return false
    if (!ethEqual(stored.subtotalEth, fresh.subtotalEth)) return false
    if (!ethEqual(stored.discountEth, fresh.discountEth)) return false
    if (!ethEqual(stored.networkFeeEth, fresh.networkFeeEth)) return false
    if (!ethEqual(stored.totalEth, fresh.totalEth)) return false
    if (stored.items.length !== fresh.items.length) return false
    return stored.items.every((item) => {
      const next = fresh.items.find((entry) => entry.editionId === item.editionId)
      return Boolean(next && next.quantity === item.quantity && ethEqual(next.unitPriceEth, item.unitPriceEth))
    })
  }

  private computeQuote(owner: OwnerRef, network: Network, persist: boolean): Quote {
    const cart = this.findCart(owner)
    if (cart.items.length === 0) throw new StoreError('O carrinho está vazio.', 422, 'EMPTY_CART')
    const coupon = cart.couponCode ? this.requireActiveCoupon(cart.couponCode) : undefined
    const items: QuoteItem[] = cart.items.map((item) => {
      const { nft, edition } = this.editionOrThrow(item.nftId, item.editionId)
      return {
        nftId: nft.id,
        editionId: edition.id,
        name: nft.name,
        image: nft.imageUrl,
        editionLabel: edition.label,
        quantity: item.quantity,
        unitPriceEth: edition.priceEth,
        available: edition.stock,
      }
    })
    const subtotalEth = addEth(...items.map((item) => multiplyEthByInt(item.unitPriceEth, item.quantity)))
    const discountEth = coupon ? percentOfEth(subtotalEth, coupon.discountPercent) : '0'
    const networkFeeEth = NETWORK_FEES[network]
    const quote: Quote = {
      id: persist ? this.nextId('quote') : `quote-preview-${this.state.counters.quote + 1}`,
      version: this.state.counters.quote + 1,
      cartId: cart.id,
      items,
      subtotalEth,
      discountEth,
      networkFeeEth,
      totalEth: addEth(subtractEth(subtotalEth, discountEth), networkFeeEth),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      network,
    }
    if (coupon) quote.couponCode = coupon.code
    if (persist) {
      this.state.counters.quote += 1
      quote.version = this.state.counters.quote
      this.state.quotes.push(quote)
      this.save()
    }
    return clone(quote)
  }

  private requireActiveCoupon(code: string): Coupon {
    const coupon = this.state.coupons.find((item) => item.code === code)
    if (!coupon || !coupon.active) {
      throw new StoreError('Cupom inválido.', 404, 'COUPON_INVALID', { fields: { code: 'Cupom inválido.' } })
    }
    if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= Date.now()) {
      throw new StoreError('Este cupom está expirado.', 422, 'COUPON_EXPIRED', {
        fields: { code: 'Este cupom está expirado.' },
      })
    }
    return coupon
  }

  private applyConfirmedOrder(order: Order): void {
    if (order.stockApplied) return
    const touched = new Set<string>()
    for (const item of order.items) {
      const nft = this.state.nfts.find((entry) => entry.id === item.nftId)
      const edition = nft?.editions.find((entry) => entry.id === item.editionId)
      if (!nft || !edition) continue
      edition.stock = Math.max(0, edition.stock - item.quantity)
      touched.add(nft.id)
    }
    for (const nftId of touched) {
      const nft = this.nftOrThrow(nftId)
      this.refreshAggregates(nft)
      nft.version += 1
      nft.updatedAt = this.timestamp()
      this.emitNft(nft)
    }
    const cart = this.state.carts.find((item) => item.ownerType === 'user' && item.ownerId === order.userId)
    if (cart) {
      for (const item of order.items) {
        const cartItem = cart.items.find((entry) => entry.editionId === item.editionId)
        if (!cartItem) continue
        cartItem.quantity -= item.quantity
        if (cartItem.quantity <= 0) cart.items = cart.items.filter((entry) => entry.id !== cartItem.id)
      }
      if (cart.items.length === 0) delete cart.couponCode
      this.touchCart(cart)
    }
    order.stockApplied = true
  }

  private mergeGuestCart(guestId: string, userId: string): void {
    const guest = this.state.carts.find((cart) => cart.ownerType === 'guest' && cart.ownerId === guestId)
    if (!guest || guest.items.length === 0) return
    const userCart = this.findCart({ id: userId, type: 'user' })
    for (const item of guest.items) {
      const found = this.state.nfts.find((nft) => nft.id === item.nftId)
      const edition = found?.editions.find((entry) => entry.id === item.editionId)
      if (!found || !edition) continue
      const existing = userCart.items.find((entry) => entry.editionId === item.editionId)
      const capped = Math.min(edition.stock, item.quantity + (existing?.quantity ?? 0))
      if (capped <= 0) {
        if (existing) userCart.items = userCart.items.filter((entry) => entry.id !== existing.id)
        continue
      }
      if (existing) existing.quantity = capped
      else userCart.items.push(this.lineFromEdition(found, edition, capped))
    }
    if (guest.couponCode && !userCart.couponCode) {
      const coupon = this.state.coupons.find((item) => item.code === guest.couponCode)
      if (coupon?.active && (!coupon.expiresAt || Date.parse(coupon.expiresAt) > Date.now())) {
        userCart.couponCode = guest.couponCode
      }
    }
    this.touchCart(userCart)
    guest.items = []
    delete guest.couponCode
    this.touchCart(guest)
  }

  private findCart(owner: OwnerRef): Cart {
    const current = this.state.carts.find((cart) => cart.ownerId === owner.id && cart.ownerType === owner.type)
    if (current) return current
    const cart: Cart = {
      id: this.nextId('cart'),
      ownerId: owner.id,
      ownerType: owner.type,
      items: [],
      version: 1,
      updatedAt: this.timestamp(),
    }
    this.state.carts.push(cart)
    this.save()
    return cart
  }

  private presentCart(cart: Cart): Cart {
    const items = cart.items.flatMap((item) => {
      const nft = this.state.nfts.find((entry) => entry.id === item.nftId)
      const edition = nft?.editions.find((entry) => entry.id === item.editionId)
      if (!nft || !edition) return []
      return [{
        ...item,
        name: nft.name,
        image: nft.imageUrl,
        editionLabel: edition.label,
        unitPriceEth: edition.priceEth,
        available: edition.stock,
        nftVersion: nft.version,
      }]
    })
    return clone({ ...cart, items })
  }

  private lineFromEdition(nft: Nft, edition: Nft['editions'][number], quantity: number): CartItem {
    return {
      id: this.nextId('item'),
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      image: nft.imageUrl,
      editionLabel: edition.label,
      quantity,
      unitPriceEth: edition.priceEth,
      available: edition.stock,
      nftVersion: nft.version,
    }
  }

  private freezeLine(item: QuoteItem): LineSnapshot {
    return {
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.name,
      image: item.image,
      editionLabel: item.editionLabel,
      quantity: item.quantity,
      unitPriceEth: item.unitPriceEth,
    }
  }

  private touchCart(cart: Cart): void {
    cart.version += 1
    cart.updatedAt = this.timestamp()
  }

  private refreshAggregates(nft: Nft): void {
    nft.stock = nft.editions.reduce((total, edition) => total + edition.stock, 0)
    const available = nft.editions.filter((edition) => edition.stock > 0)
    const pool = available.length > 0 ? available : nft.editions
    nft.priceEth = minEth(pool.map((edition) => edition.priceEth))
    nft.imageUrl = nft.images[0]
  }

  private priceBound(value: string | undefined, field: string): bigint | undefined {
    if (!value) return undefined
    try {
      return parseEth(value)
    } catch {
      throw validation({ [field]: 'Informe um valor em ETH.' })
    }
  }

  private parseQuantity(value: number): number {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw validation({ quantity: 'Informe uma quantidade inteira.' })
    }
    return value
  }

  private nftOrThrow(nftId: string): Nft {
    const nft = this.state.nfts.find((item) => item.id === nftId)
    if (!nft) throw new StoreError('NFT não encontrado.', 404, 'NFT_NOT_FOUND')
    return nft
  }

  private editionOrThrow(nftId: string, editionId: string): { nft: Nft; edition: Nft['editions'][number] } {
    const nft = this.nftOrThrow(nftId)
    const edition = nft.editions.find((item) => item.id === editionId)
    if (!edition) throw new StoreError('Edição não encontrada.', 404, 'EDITION_NOT_FOUND')
    return { nft, edition }
  }

  private userOrThrow(userId: string): SeedUser {
    const user = this.state.users.find((item) => item.id === userId)
    if (!user) throw new StoreError('Usuário não encontrado.', 404, 'USER_NOT_FOUND')
    return user
  }

  private walletOrThrow(userId: string, walletId: string): Wallet {
    const wallet = this.state.wallets.find((item) => item.id === walletId && item.userId === userId)
    if (!wallet) throw new StoreError('Carteira não encontrada.', 404, 'WALLET_NOT_FOUND')
    return wallet
  }

  private txHash(orderId: string): string {
    return `0x${hashPassword(orderId).slice(5).padEnd(64, '0').slice(0, 64)}`
  }

  private explorer(network: Network, txHash: string): string {
    const host = network === 'polygon' ? 'https://amoy.polygonscan.com/tx/' : 'https://sepolia.etherscan.io/tx/'
    return `${host}${txHash}`
  }

  private emitNft(nft: Nft): void {
    const event: NftUpdatedEvent = {
      id: this.nextEventId(),
      type: 'nft.updated',
      resourceId: nft.id,
      version: nft.version,
      occurredAt: this.timestamp(),
      data: clone(nft),
    }
    this.publish(event)
  }

  private emitOrder(order: Order): void {
    const event: OrderUpdatedEvent = {
      id: this.nextEventId(),
      type: 'order.updated',
      resourceId: order.id,
      version: order.version,
      occurredAt: this.timestamp(),
      data: clone(order),
    }
    this.publish(event)
  }
}

export const store = new MockStore()
export type { OwnerRef }
