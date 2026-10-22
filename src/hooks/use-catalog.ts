import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getNft, listNfts } from '@/lib/api/nfts'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import type { CatalogFilters, Nft, PaginatedResult } from '@/shared/types'

function mergeCatalog(fetched: PaginatedResult<Nft>, cached?: PaginatedResult<Nft>): PaginatedResult<Nft> {
  if (!cached) return fetched
  return {
    ...fetched,
    data: fetched.data.map((nft) => {
      const previous = cached.data.find((item) => item.id === nft.id)
      return previous && previous.version > nft.version ? previous : nft
    }),
  }
}

export function useCatalog(filters: CatalogFilters) {
  return useQuery({
    queryKey: queryKeys.catalog(filters),
    placeholderData: keepPreviousData,
    queryFn: async ({ signal, queryKey }) => {
      const fetched = await listNfts(filters, signal)
      const cached = queryClient.getQueryData<PaginatedResult<Nft>>(queryKey)
      return mergeCatalog(fetched, cached)
    },
  })
}

export function useNft(id: string) {
  return useQuery({
    queryKey: queryKeys.nft(id),
    queryFn: async ({ signal }) => {
      const fetched = await getNft(id, signal)
      const cached = queryClient.getQueryData<Nft>(queryKeys.nft(id))
      if (cached && cached.version > fetched.version) return cached
      return fetched
    },
  })
}
