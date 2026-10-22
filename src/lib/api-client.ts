import axios from 'axios'
import { toast } from 'sonner'
import { removeAllUserQueries, queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { safeInternalPath } from '@/lib/paths'
import { waitForMocks } from '@/mocks/ready'

export const TOKEN_STORAGE_KEY = 'aurea-token'
export const GUEST_STORAGE_KEY = 'aurea-guest-id'

let redirecting = false

export function getGuestId(): string {
  let guestId = localStorage.getItem(GUEST_STORAGE_KEY)
  if (!guestId) {
    guestId = crypto.randomUUID()
    localStorage.setItem(GUEST_STORAGE_KEY, guestId)
  }
  return guestId
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(async (config) => {
  await waitForMocks()
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Guest-Id', getGuestId())
  return config
})

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error
  const url = error.config?.url ?? ''
  const isCredentialCall = ['/auth/login', '/auth/register', '/auth/logout'].some((path) => url.includes(path))
  if (isCredentialCall || redirecting) throw error

  redirecting = true
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  queryClient.setQueryData(queryKeys.session, null)
  removeAllUserQueries()
  const { destroyActiveSocket } = await import('@/lib/socket-manager')
  destroyActiveSocket()
  toast.error('Sua sessão expirou')
  const { router } = await import('@/router')
  const location = router.state.location
  if (location.pathname !== '/login') {
    const back = safeInternalPath(`${location.pathname}${location.searchStr}`)
    await router.navigate({ href: `/login?redirect=${encodeURIComponent(back)}` })
  }
  redirecting = false
  throw error
})

export default apiClient
