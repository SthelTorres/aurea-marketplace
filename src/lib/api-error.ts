import axios from 'axios'
import type { ApiErrorBody } from '@/shared/types'

export function apiErrorBody(error: unknown): ApiErrorBody | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const data = error.response?.data as ApiErrorBody | undefined
  if (!data || typeof data.message !== 'string') return undefined
  return data
}

export function apiErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  return apiErrorBody(error)?.message ?? (error instanceof Error ? error.message : fallback)
}

export function apiFieldErrors(error: unknown): Record<string, string> {
  const body = apiErrorBody(error)
  const fields = { ...(body?.details?.fields ?? {}) }
  if (body?.code === 'EMAIL_TAKEN' && !fields.email) fields.email = body.message
  if ((body?.code === 'COUPON_INVALID' || body?.code === 'COUPON_EXPIRED') && !fields.code) fields.code = body.message
  if (body?.code === 'INVALID_CREDENTIALS' && !fields.form) fields.form = body.message
  if (body?.code === 'WALLET_REJECTED' && !fields.walletId) fields.walletId = body.message
  if (body?.code === 'OUT_OF_STOCK' && !fields.quantity) fields.quantity = body.message
  return fields
}

export function isTimeoutError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return true
  const status = error.response?.status
  return status === 504 || status === 503 || status === undefined
}

export function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}
