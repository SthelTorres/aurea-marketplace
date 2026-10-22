import { apiClient } from '@/lib/api-client'
import type { Wallet, WalletRole } from '@/shared/types'

export interface CreateWalletInput {
  label: string
  address: string
  role: WalletRole
}

export async function listWallets(signal?: AbortSignal): Promise<Wallet[]> {
  const { data } = await apiClient.get<Wallet[]>('/wallets', { signal })
  return data
}

export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  const { data } = await apiClient.post<Wallet>('/wallets', input)
  return data
}

export async function updateWallet(id: string, input: { label?: string; address?: string }): Promise<Wallet> {
  const { data } = await apiClient.patch<Wallet>(`/wallets/${id}`, input)
  return data
}

export async function connectWallet(id: string): Promise<Wallet> {
  const { data } = await apiClient.post<Wallet>(`/wallets/${id}/connect`)
  return data
}

export async function disconnectWallet(id: string): Promise<Wallet> {
  const { data } = await apiClient.post<Wallet>(`/wallets/${id}/disconnect`)
  return data
}
