import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { addFavorite, listFavorites, removeFavorite } from '@/lib/api/favorites'
import { queryKeys } from '@/lib/query-keys'
import { useSession } from '@/hooks/use-session'
import type { Favorite } from '@/shared/types'

export function useFavorites() {
  const queryClient = useQueryClient()
  const { isAuthenticated, session } = useSession()
  const userId = session?.user.id
  const key = queryKeys.favorites(userId ?? 'anonymous')
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listFavorites(signal),
    enabled: Boolean(isAuthenticated && userId),
    refetchOnMount: 'always',
  })
  const intent = useRef(new Map<string, boolean>())
  const toggle = useMutation({
    mutationFn: async (nftId: string) => {
      const exists = intent.current.get(nftId) ?? false
      intent.current.delete(nftId)
      if (exists) await removeFavorite(nftId)
      else await addFavorite(nftId)
    },
    onMutate: async (nftId) => {
      if (!userId) return { previous: undefined }
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorite[]>(key) ?? []
      const exists = previous.some((item) => item.nftId === nftId)
      intent.current.set(nftId, exists)
      queryClient.setQueryData<Favorite[]>(
        key,
        exists
          ? previous.filter((item) => item.nftId !== nftId)
          : [...previous, { id: `optimistic-${nftId}`, userId, nftId, createdAt: '' }],
      )
      return { previous }
    },
    onError: (_error, _nftId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: key })
    },
  })
  return { ...query, favorites: query.data ?? [], toggle }
}
