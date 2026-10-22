import { apiClient } from '@/lib/api-client'
import type { CreateOrderBody, Order } from '@/shared/types'

export async function createOrder(body: CreateOrderBody, idempotencyKey: string): Promise<Order> {
  const { data } = await apiClient.post<Order>('/orders', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/orders/${id}`, { signal })
  return data
}
