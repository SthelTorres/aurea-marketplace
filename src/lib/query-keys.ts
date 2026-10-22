import type { CatalogFilters, Network, OwnerRef } from '@/shared/types'

/**
 * Chaves privadas incluem a identidade:
 * - usuário: ['user', userId, ...]
 * - visitante: ['guest', guestId, ...]
 * Catálogo e detalhe são públicos e não carregam userId.
 */
export const queryKeys = {
  session: ['session'] as const,
  catalog: (filters: CatalogFilters) => ['nfts', filters] as const,
  catalogs: ['nfts'] as const,
  nft: (id: string) => ['nft', id] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  cart: (owner: OwnerRef) =>
    owner.type === 'user'
      ? ['user', owner.id, 'cart'] as const
      : ['guest', owner.id, 'cart'] as const,
  quote: (owner: OwnerRef, cartVersion: number, network: Network) =>
    owner.type === 'user'
      ? ['user', owner.id, 'quote', cartVersion, network] as const
      : ['guest', owner.id, 'quote', cartVersion, network] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  order: (userId: string, orderId: string) => ['user', userId, 'orders', orderId] as const,
  orders: (userId: string) => ['user', userId, 'orders'] as const,
}
