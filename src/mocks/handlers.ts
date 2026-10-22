import { SCENARIOS, type CatalogFilters, type CatalogSort, type CreateOrderBody, type Network, type NftCategory, type OrderStatus, type Scenario, type WalletRole } from '@/shared/types'
import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import { disconnectAll, restoreSockets } from './socket-hub'
import { SCENARIO_KEY, store, StoreError, type OwnerRef } from './store'

const categories: NftCategory[] = ['Rare', 'Common', 'Legendary', 'Epic']
const sorts: CatalogSort[] = ['price_asc', 'price_desc', 'newest', 'name']
const networks: Network[] = ['ethereum', 'polygon']

let catalogWave = 0
let lastCatalogAt = 0

function errorResponse(error: unknown): HttpResponse<JsonBodyType> {
  if (error instanceof StoreError) {
    return HttpResponse.json(
      { message: error.message, code: error.code, details: error.details },
      { status: error.status },
    )
  }
  console.error('[mock-api]', error)
  return HttpResponse.json(
    { message: 'Ocorreu um erro inesperado no servidor.', code: 'INTERNAL_ERROR' },
    { status: 500 },
  )
}

function tokenFrom(request: Request): string | undefined {
  return request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
}

function isDev(url: URL): boolean {
  return url.pathname.startsWith('/api/dev')
}

function isPrivate(pathname: string): boolean {
  return ['/api/favorites', '/api/orders', '/api/profile', '/api/wallets'].some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function latencyFor(url: URL, scenario: Scenario): number {
  if (scenario === 'slow') return 1_500
  if (scenario === 'variable-latency') return store.randomDelay()
  if (scenario === 'out-of-order' && url.pathname === '/api/nfts') {
    const now = Date.now()
    if (now - lastCatalogAt > 8_000) catalogWave = 0
    lastCatalogAt = now
    catalogWave += 1
    return Math.max(80, 1_800 - (catalogWave - 1) * 500)
  }
  return 150
}

async function execute(request: Request, callback: () => unknown | Promise<unknown>): Promise<HttpResponse<JsonBodyType>> {
  const url = new URL(request.url)
  if (!isDev(url)) {
    const scenario = store.getScenario()
    if (scenario === 'offline') return HttpResponse.error()
    if (scenario === 'session-expired' && request.headers.get('Authorization')) {
      store.expireToken(tokenFrom(request))
      return errorResponse(new StoreError('Sua sessão expirou. Entre novamente.', 401, 'UNAUTHORIZED'))
    }
    if (scenario === 'forbidden' && isPrivate(url.pathname)) {
      return errorResponse(new StoreError('Você não tem permissão para esta ação.', 403, 'FORBIDDEN'))
    }
    await delay(latencyFor(url, scenario))
  }
  try {
    const data = await callback()
    if (data instanceof HttpResponse) return data
    return HttpResponse.json((data ?? null) as JsonBodyType)
  } catch (error) {
    return errorResponse(error)
  }
}

function requireSession(request: Request) {
  const session = store.getSessionFromToken(tokenFrom(request))
  if (!session) throw new StoreError('Sua sessão expirou. Entre novamente.', 401, 'UNAUTHORIZED')
  return session
}

function ownerFrom(request: Request): OwnerRef {
  const token = tokenFrom(request)
  if (token) return { id: requireSession(request).user.id, type: 'user' }
  const guestId = request.headers.get('X-Guest-Id')
  if (!guestId) throw new StoreError('Identificador de visitante ausente.', 400, 'GUEST_ID_REQUIRED')
  return { id: guestId, type: 'guest' }
}

async function body<T>(request: Request): Promise<T> {
  const text = await request.text()
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new StoreError('Corpo da requisição inválido.', 400, 'INVALID_JSON')
  }
}

function param(params: Record<string, string | readonly string[] | undefined>, name: string): string {
  const value = params[name]
  if (typeof value !== 'string' || value.length === 0) {
    throw new StoreError('Parâmetro inválido.', 400, 'INVALID_PARAMETER')
  }
  return value
}

export const handlers = [
  http.post('/api/auth/register', ({ request }) => execute(request, async () => {
    const input = await body<{ name?: string; email?: string; password?: string }>(request)
    return store.register(input, request.headers.get('X-Guest-Id') ?? undefined)
  })),

  http.post('/api/auth/login', ({ request }) => execute(request, async () => {
    const input = await body<{ email?: string; password?: string }>(request)
    return store.login(input.email ?? '', input.password ?? '', request.headers.get('X-Guest-Id') ?? undefined)
  })),

  http.get('/api/auth/session', ({ request }) => execute(request, () => requireSession(request))),

  http.post('/api/auth/logout', ({ request }) => execute(request, () => {
    store.logout(tokenFrom(request))
    return new HttpResponse(null, { status: 204 })
  })),

  http.get('/api/nfts', ({ request }) => execute(request, () => {
    const scenario = store.getScenario()
    if (scenario === 'server-error') {
      throw new StoreError('Erro interno ao carregar o catálogo.', 500, 'INTERNAL_ERROR')
    }
    if (scenario === 'fail-catalog') {
      throw new StoreError('O catálogo está indisponível.', 503, 'CATALOG_UNAVAILABLE')
    }
    const url = new URL(request.url)
    const category = url.searchParams.get('category') || undefined
    const sort = url.searchParams.get('sort') || undefined
    if (category && !categories.includes(category as NftCategory)) {
      throw new StoreError('Categoria inválida.', 422, 'VALIDATION_ERROR', { fields: { category: 'Categoria inválida.' } })
    }
    if (sort && !sorts.includes(sort as CatalogSort)) {
      throw new StoreError('Ordenação inválida.', 422, 'VALIDATION_ERROR', { fields: { sort: 'Ordenação inválida.' } })
    }
    const filters: CatalogFilters = {
      q: url.searchParams.get('q') || undefined,
      category: category as NftCategory | undefined,
      minPrice: url.searchParams.get('minPrice') || undefined,
      maxPrice: url.searchParams.get('maxPrice') || undefined,
      sort: sort as CatalogSort | undefined,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('pageSize') || 12),
    }
    return store.listNfts(filters)
  })),

  http.get('/api/nfts/:id', ({ request, params }) => execute(request, () => {
    if (store.getScenario() === 'server-error') {
      throw new StoreError('Erro interno ao carregar a obra.', 500, 'INTERNAL_ERROR')
    }
    return store.getNft(param(params, 'id'))
  })),

  http.get('/api/favorites', ({ request }) => execute(request, () => store.listFavorites(requireSession(request).user.id))),

  http.post('/api/favorites', ({ request }) => execute(request, async () => {
    if (store.getScenario() === 'favorite-fail') {
      throw new StoreError('Não foi possível atualizar os favoritos.', 500, 'FAVORITE_FAILED')
    }
    const session = requireSession(request)
    const input = await body<{ nftId?: string }>(request)
    if (!input.nftId) throw new StoreError('Informe a obra.', 422, 'VALIDATION_ERROR', { fields: { nftId: 'Informe a obra.' } })
    return store.addFavorite(session.user.id, input.nftId)
  })),

  http.delete('/api/favorites/:nftId', ({ request, params }) => execute(request, () => {
    if (store.getScenario() === 'favorite-fail') {
      throw new StoreError('Não foi possível atualizar os favoritos.', 500, 'FAVORITE_FAILED')
    }
    store.removeFavorite(requireSession(request).user.id, param(params, 'nftId'))
    return new HttpResponse(null, { status: 204 })
  })),

  http.get('/api/cart', ({ request }) => execute(request, () => store.getCart(ownerFrom(request)))),

  http.post('/api/cart/items', ({ request }) => execute(request, async () => {
    const input = await body<{ nftId?: string; editionId?: string; quantity?: number }>(request)
    return store.addCartItem(ownerFrom(request), input)
  })),

  http.patch('/api/cart/items/:id', ({ request, params }) => execute(request, async () => {
    const input = await body<{ quantity?: number }>(request)
    return store.updateCartItem(ownerFrom(request), param(params, 'id'), Number(input.quantity))
  })),

  http.delete('/api/cart/items/:id', ({ request, params }) => execute(request, () =>
    store.removeCartItem(ownerFrom(request), param(params, 'id')))),

  http.post('/api/cart/coupon', ({ request }) => execute(request, async () => {
    const input = await body<{ code?: string }>(request)
    return store.applyCoupon(ownerFrom(request), input.code ?? '')
  })),

  http.delete('/api/cart/coupon', ({ request }) => execute(request, () => store.removeCoupon(ownerFrom(request)))),

  http.post('/api/checkout/quote', ({ request }) => execute(request, async () => {
    const input = await body<{ network?: Network }>(request)
    const network = input.network ?? 'ethereum'
    if (!networks.includes(network)) {
      throw new StoreError('Rede inválida.', 422, 'VALIDATION_ERROR', { fields: { network: 'Selecione a rede.' } })
    }
    return store.quoteCart(ownerFrom(request), network)
  })),

  http.post('/api/orders', ({ request }) => execute(request, async () => {
    const session = requireSession(request)
    const input = await body<CreateOrderBody>(request)
    const result = store.createOrder(session.user.id, request.headers.get('Idempotency-Key') ?? '', input)
    if (result.timeout) {
      await delay(1_200)
      throw new StoreError('O gateway de pagamento não respondeu a tempo.', 504, 'GATEWAY_TIMEOUT')
    }
    return result.order
  })),

  http.get('/api/orders/:id', ({ request, params }) => execute(request, () =>
    store.getOrder(requireSession(request).user.id, param(params, 'id')))),

  http.get('/api/profile', ({ request }) => execute(request, () => store.getProfile(requireSession(request).user.id))),

  http.patch('/api/profile', ({ request }) => execute(request, async () => {
    const session = requireSession(request)
    return store.updateProfile(session.user.id, await body<{ name?: string; email?: string; avatarUrl?: string }>(request))
  })),

  http.post('/api/profile/password', ({ request }) => execute(request, async () => {
    const session = requireSession(request)
    const input = await body<{ currentPassword?: string; newPassword?: string }>(request)
    return store.changePassword(session.user.id, input.currentPassword ?? '', input.newPassword ?? '')
  })),

  http.get('/api/wallets', ({ request }) => execute(request, () => store.listWallets(requireSession(request).user.id))),

  http.post('/api/wallets', ({ request }) => execute(request, async () => {
    const session = requireSession(request)
    return store.createWallet(session.user.id, await body<{ label?: string; address?: string; role?: WalletRole }>(request))
  })),

  http.patch('/api/wallets/:id', ({ request, params }) => execute(request, async () => {
    const session = requireSession(request)
    return store.updateWallet(session.user.id, param(params, 'id'), await body<{ label?: string; address?: string }>(request))
  })),

  http.post('/api/wallets/:id/connect', ({ request, params }) => execute(request, () =>
    store.connectWallet(requireSession(request).user.id, param(params, 'id')))),

  http.post('/api/wallets/:id/disconnect', ({ request, params }) => execute(request, () =>
    store.disconnectWallet(requireSession(request).user.id, param(params, 'id')))),

  http.post('/api/dev/reset', () => execute(new Request('http://local/api/dev/reset'), () => store.reset())),

  http.post('/api/dev/scenario', ({ request }) => execute(request, async () => {
    const input = await body<{ scenario?: Scenario }>(request)
    if (!input.scenario || !SCENARIOS.includes(input.scenario)) {
      throw new StoreError('Cenário inválido.', 422, 'VALIDATION_ERROR', { fields: { scenario: 'Cenário inválido.' } })
    }
    localStorage.setItem(SCENARIO_KEY, input.scenario)
    return { scenario: store.setScenario(input.scenario) }
  })),

  http.post('/api/dev/expire-session', ({ request }) => execute(request, () => {
    store.expireToken(tokenFrom(request))
    return { ok: true }
  })),

  http.post('/api/dev/emit-nft-update', ({ request }) => execute(request, async () => {
    const input = await body<{ nftId?: string; editionId?: string; priceEth?: string; stock?: number }>(request)
    return store.updateNftForDev(input)
  })),

  http.post('/api/dev/emit-order-update', ({ request }) => execute(request, async () => {
    const input = await body<{ orderId?: string; status?: OrderStatus }>(request)
    if (!input.orderId) throw new StoreError('Informe o pedido.', 422, 'VALIDATION_ERROR', { fields: { orderId: 'Informe o pedido.' } })
    return store.emitOrderUpdate(input.orderId, input.status)
  })),

  http.post('/api/dev/socket/replay-last', () => execute(new Request('http://local/api/dev/socket/replay-last'), () =>
    store.replayLast())),

  http.post('/api/dev/socket/emit-stale', ({ request }) => execute(request, async () => {
    const input = await body<{ nftId?: string }>(request)
    if (!input.nftId) throw new StoreError('Informe o NFT.', 422, 'VALIDATION_ERROR', { fields: { nftId: 'Informe o NFT.' } })
    return store.emitStaleNft(input.nftId)
  })),

  http.post('/api/dev/socket/disconnect', () => execute(new Request('http://local/api/dev/socket/disconnect'), () =>
    disconnectAll())),

  http.post('/api/dev/socket/restore', () => execute(new Request('http://local/api/dev/socket/restore'), () =>
    restoreSockets())),
]
