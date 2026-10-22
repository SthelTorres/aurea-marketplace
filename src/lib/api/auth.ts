import { apiClient, TOKEN_STORAGE_KEY } from '@/lib/api-client'
import type { Session } from '@/shared/types'

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

function persistSession(session: Session): Session {
  localStorage.setItem(TOKEN_STORAGE_KEY, session.token)
  return session
}

export async function register(input: RegisterInput): Promise<Session> {
  const { data } = await apiClient.post<Session>('/auth/register', input)
  return persistSession(data)
}

export async function login(input: LoginInput): Promise<Session> {
  const { data } = await apiClient.post<Session>('/auth/login', input)
  return persistSession(data)
}

export async function getSession(): Promise<Session | null> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) return null
  const { data } = await apiClient.get<Session>('/auth/session')
  if (localStorage.getItem(TOKEN_STORAGE_KEY) !== token) return null
  return data
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } finally {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}
