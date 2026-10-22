export const CATEGORIES = ['Rare', 'Common', 'Legendary', 'Epic'] as const
export type NftCategory = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<NftCategory, string> = {
  Rare: 'Rara',
  Common: 'Comum',
  Legendary: 'Lendária',
  Epic: 'Épica',
}

export const SORTS = ['price_asc', 'price_desc', 'newest', 'name'] as const
export type CatalogSort = (typeof SORTS)[number]

export const SORT_LABELS: Record<CatalogSort, string> = {
  newest: 'Mais recentes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  name: 'Nome',
}

export type OrderStatus = 'pending' | 'confirmed' | 'refused'
export type WalletRole = 'primary' | 'secondary'
export type Network = 'ethereum' | 'polygon'

export const SCENARIOS = [
  'default',
  'slow',
  'variable-latency',
  'out-of-order',
  'offline',
  'server-error',
  'fail-catalog',
  'forbidden',
  'session-expired',
  'favorite-fail',
  'price-change',
  'sold-out',
  'payment-refuse',
  'payment-timeout',
  'wallet-refuse',
] as const

export type Scenario = (typeof SCENARIOS)[number]

export const SCENARIO_LABELS: Record<Scenario, string> = {
  default: 'Padrão (150 ms)',
  slow: 'Lento (1500 ms)',
  'variable-latency': 'Latência variável',
  'out-of-order': 'Respostas fora de ordem',
  offline: 'Sem conexão',
  'server-error': 'Erro 500 no catálogo',
  'fail-catalog': 'Catálogo indisponível (503)',
  forbidden: 'Acesso negado (403)',
  'session-expired': 'Sessão expirada',
  'favorite-fail': 'Falha ao favoritar',
  'price-change': 'Preço muda no pedido',
  'sold-out': 'Esgota no pedido',
  'payment-refuse': 'Pagamento recusado',
  'payment-timeout': 'Timeout do pagamento',
  'wallet-refuse': 'Carteira recusada',
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Session {
  token: string
  user: User
  expiresAt: string
}

export interface NftEdition {
  id: string
  nftId: string
  number: number
  label: string
  stock: number
  priceEth: string
}

export interface Nft {
  id: string
  name: string
  description: string
  category: NftCategory
  creator: string
  priceEth: string
  stock: number
  imageUrl: string
  images: [string, string, string]
  editions: NftEdition[]
  featured: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  id: string
  nftId: string
  editionId: string
  name: string
  image: string
  editionLabel: string
  quantity: number
  unitPriceEth: string
  available: number
  nftVersion: number
}

export interface Cart {
  id: string
  ownerId: string
  ownerType: 'user' | 'guest'
  items: CartItem[]
  couponCode?: string
  version: number
  updatedAt: string
}

export interface Coupon {
  code: string
  discountPercent: number
  expiresAt?: string
  active: boolean
}

export interface LineSnapshot {
  nftId: string
  editionId: string
  name: string
  image: string
  editionLabel: string
  quantity: number
  unitPriceEth: string
}

export interface QuoteItem extends LineSnapshot {
  available: number
}

export interface Quote {
  id: string
  version: number
  cartId: string
  items: QuoteItem[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode?: string
  expiresAt: string
  network: Network
}

export interface Order {
  id: string
  userId: string
  quoteId: string
  items: LineSnapshot[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode?: string
  network: Network
  walletId: string
  walletAddress: string
  collector: { name: string; email: string }
  txHash?: string
  explorerUrl?: string
  status: OrderStatus
  idempotencyKey: string
  version: number
  stockApplied: boolean
  autoConfirmAt?: string
  createdAt: string
  updatedAt: string
}

export interface Wallet {
  id: string
  userId: string
  label: string
  address: string
  role: WalletRole
  connected: boolean
  createdAt: string
  updatedAt: string
}

export interface Favorite {
  id: string
  userId: string
  nftId: string
  createdAt: string
  nft?: Nft
}

export interface ApiErrorDetails {
  fields?: Record<string, string>
  available?: number
  quote?: Quote
}

export interface ApiErrorBody {
  message: string
  code: string
  details?: ApiErrorDetails
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: Pagination
}

export interface CatalogFilters {
  q?: string
  category?: NftCategory
  minPrice?: string
  maxPrice?: string
  sort?: CatalogSort
  page?: number
  pageSize?: number
}

export interface RealtimeEvent<T = Nft | Order> {
  id: string
  type: 'nft.updated' | 'order.updated'
  resourceId: string
  version: number
  occurredAt: string
  data: T
}

export type NftUpdatedEvent = RealtimeEvent<Nft> & { type: 'nft.updated' }
export type OrderUpdatedEvent = RealtimeEvent<Order> & { type: 'order.updated' }

export interface CreateOrderBody {
  quoteId: string
  network: Network
  walletId: string
  collector: { name: string; email: string }
}

export interface OwnerRef {
  id: string
  type: 'user' | 'guest'
}
