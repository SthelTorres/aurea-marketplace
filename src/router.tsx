import { createRootRoute, createRoute, createRouter, isRedirect, lazyRouteComponent, redirect } from '@tanstack/react-router'
import { RoutePending } from '@/components/common/route-pending'
import { AppShell } from '@/components/layout/app-shell'
import { getSession } from '@/lib/api/auth'
import { getToken } from '@/lib/api-client'
import { safeInternalPath } from '@/lib/paths'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { HomePage } from '@/routes/home-page'
import { NftDetailPage } from '@/routes/nft-detail-page'

const NotFound = lazyRouteComponent(() => import('@/routes/not-found-page'), 'NotFoundPage')

const CATEGORIES = ['Rare', 'Common', 'Legendary', 'Epic'] as const
const SORTS = ['price_asc', 'price_desc', 'newest', 'name'] as const

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function optionalPositiveInt(value: unknown, max?: number): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return undefined
  if (max !== undefined && parsed > max) return undefined
  return parsed
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

function parseCatalogSearch(search: Record<string, unknown>) {
  const q = optionalString(search.q)
  const category = oneOf(search.category, CATEGORIES)
  const minPrice = optionalString(search.minPrice)
  const maxPrice = optionalString(search.maxPrice)
  const sort = oneOf(search.sort, SORTS)
  const page = optionalPositiveInt(search.page)
  const pageSize = optionalPositiveInt(search.pageSize, 48)
  return {
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(minPrice ? { minPrice } : {}),
    ...(maxPrice ? { maxPrice } : {}),
    ...(sort ? { sort } : {}),
    ...(page ? { page } : {}),
    ...(pageSize ? { pageSize } : {}),
  }
}

function parseAuthSearch(search: Record<string, unknown>) {
  const redirectTo = optionalString(search.redirect)
  return redirectTo ? { redirect: redirectTo } : {}
}

async function requireUser(location: { pathname: string; searchStr: string }) {
  const back = safeInternalPath(`${location.pathname}${location.searchStr}`)
  if (!getToken()) throw redirect({ to: '/login', search: { redirect: back } })
  try {
    const session = await queryClient.ensureQueryData({
      queryKey: queryKeys.session,
      queryFn: getSession,
      staleTime: 30_000,
    })
    if (!session?.user) throw redirect({ to: '/login', search: { redirect: back } })
    return session
  } catch (error) {
    if (isRedirect(error)) throw error
    throw redirect({ to: '/login', search: { redirect: back } })
  }
}

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => parseCatalogSearch(search),
  component: HomePage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  component: NftDetailPage,
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carrinho',
  component: lazyRouteComponent(() => import('@/routes/cart-page'), 'CartPage'),
})

const paymentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pagamento',
  beforeLoad: ({ location }) => requireUser(location),
  component: lazyRouteComponent(() => import('@/routes/payment-page'), 'PaymentPage'),
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedidos/$orderId',
  beforeLoad: ({ location }) => requireUser(location),
  component: lazyRouteComponent(() => import('@/routes/order-page'), 'OrderPage'),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search) => parseAuthSearch(search),
  component: lazyRouteComponent(() => import('@/routes/login-page'), 'LoginPage'),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  validateSearch: (search) => parseAuthSearch(search),
  component: lazyRouteComponent(() => import('@/routes/register-page'), 'RegisterPage'),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  beforeLoad: ({ location }) => requireUser(location),
  component: lazyRouteComponent(() => import('@/routes/profile-page'), 'ProfilePage'),
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carteiras',
  beforeLoad: ({ location }) => requireUser(location),
  component: lazyRouteComponent(() => import('@/routes/wallets-page'), 'WalletsPage'),
})

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favoritos',
  beforeLoad: ({ location }) => requireUser(location),
  component: lazyRouteComponent(() => import('@/routes/favorites-page'), 'FavoritesPage'),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftRoute,
  cartRoute,
  paymentRoute,
  orderRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
])

function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr)
  return Object.fromEntries(params.entries())
}

function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const value = params.toString()
  return value ? `?${value}` : ''
}

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: RoutePending,
  defaultPendingMs: 200,
  context: {},
  parseSearch,
  stringifySearch,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
