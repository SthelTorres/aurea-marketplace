import { apiClient } from '@/lib/api-client'
import type { User } from '@/shared/types'

export async function getProfile(signal?: AbortSignal): Promise<User> {
  const { data } = await apiClient.get<User>('/profile', { signal })
  return data
}

export async function updateProfile(input: { name?: string; email?: string; avatarUrl?: string }): Promise<User> {
  const { data } = await apiClient.patch<User>('/profile', input)
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/profile/password', { currentPassword, newPassword })
}
