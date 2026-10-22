import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as auth from '@/lib/api/auth'
import { getGuestId, getToken } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import { removeAllUserQueries, removeOtherUserQueries } from '@/lib/query-client'
import { leaveSession } from '@/lib/socket-manager'
import type { OwnerRef, Session } from '@/shared/types'

async function syncIdentity(queryClient: ReturnType<typeof useQueryClient>, session: Session): Promise<void> {
  removeOtherUserQueries(session.user.id)
  queryClient.setQueryData(queryKeys.session, session)
  await queryClient.invalidateQueries({ queryKey: queryKeys.cart({ type: 'user', id: session.user.id }) })
  await queryClient.invalidateQueries({ queryKey: queryKeys.favorites(session.user.id) })
  await queryClient.invalidateQueries({ queryKey: queryKeys.cart({ type: 'guest', id: getGuestId() }) })
}

export function useSession() {
  const queryClient = useQueryClient()
  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: auth.getSession,
    retry: false,
  })
  const login = useMutation({
    mutationFn: auth.login,
    onSuccess: (data) => syncIdentity(queryClient, data),
  })
  const register = useMutation({
    mutationFn: auth.register,
    onSuccess: (data) => syncIdentity(queryClient, data),
  })
  const logout = useMutation({
    mutationFn: async () => {
      leaveSession()
      await auth.logout()
    },
    onSuccess: async () => {
      queryClient.setQueryData(queryKeys.session, null)
      removeAllUserQueries()
      queryClient.removeQueries({ queryKey: queryKeys.session })
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart({ type: 'guest', id: getGuestId() }) })
    },
  })

  const userId = sessionQuery.data?.user.id
  let owner: OwnerRef | null = null
  if (userId) owner = { type: 'user', id: userId }
  else if (!getToken() || sessionQuery.isFetched) owner = { type: 'guest', id: getGuestId() }

  return {
    ...sessionQuery,
    session: sessionQuery.data ?? undefined,
    isAuthenticated: Boolean(userId),
    owner,
    login,
    register,
    logout,
  }
}
