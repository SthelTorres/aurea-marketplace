import { apiClient } from '@/lib/api-client'
import type { Cart, Network, Quote } from '@/shared/types'

export interface AddCartItemInput {
  nftId: string
  editionId: string
  quantity?: number
}

export async function getCart(signal?: AbortSignal): Promise<Cart> {
  const { data } = await apiClient.get<Cart>('/cart', { signal })
  return data
}

export async function addCartItem(input: AddCartItemInput): Promise<Cart> {
  const { data } = await apiClient.post<Cart>('/cart/items', input)
  return data
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  const { data } = await apiClient.patch<Cart>(`/cart/items/${itemId}`, { quantity })
  return data
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  const { data } = await apiClient.delete<Cart>(`/cart/items/${itemId}`)
  return data
}

export async function applyCoupon(code: string): Promise<Cart> {
  const { data } = await apiClient.post<Cart>('/cart/coupon', { code })
  return data
}

export async function removeCoupon(): Promise<Cart> {
  const { data } = await apiClient.delete<Cart>('/cart/coupon')
  return data
}

export async function createQuote(network: Network, signal?: AbortSignal): Promise<Quote> {
  const { data } = await apiClient.post<Quote>('/checkout/quote', { network }, { signal })
  return data
}
