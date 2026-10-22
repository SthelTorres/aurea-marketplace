import { apiClient } from '@/lib/api-client'
import type { CatalogFilters, Nft, PaginatedResult } from '@/shared/types'

export async function listNfts(filters: CatalogFilters = {}, signal?: AbortSignal): Promise<PaginatedResult<Nft>> {
  const { data } = await apiClient.get<PaginatedResult<Nft>>('/nfts', { params: filters, signal })
  return data
}

export async function getNft(id: string, signal?: AbortSignal): Promise<Nft> {
  const { data } = await apiClient.get<Nft>(`/nfts/${id}`, { signal })
  return data
}
