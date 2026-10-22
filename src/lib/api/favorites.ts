import { apiClient } from '@/lib/api-client'
import type { Favorite } from '@/shared/types'

export async function listFavorites(signal?: AbortSignal): Promise<Favorite[]> {
  const { data } = await apiClient.get<Favorite[]>('/favorites', { signal })
  return data
}

export async function addFavorite(nftId: string): Promise<Favorite> {
  const { data } = await apiClient.post<Favorite>('/favorites', { nftId })
  return data
}

export async function removeFavorite(nftId: string): Promise<void> {
  await apiClient.delete(`/favorites/${nftId}`)
}
