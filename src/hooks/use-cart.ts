import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as cartApi from '@/lib/api/cart'
import { apiErrorMessage } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { useSession } from '@/hooks/use-session'
import type { Cart } from '@/shared/types'

function mergeCart(fetched: Cart, cached?: Cart): Cart {
  if (!cached) return fetched
  if (cached.version > fetched.version) return cached
  return {
    ...fetched,
    items: fetched.items.map((item) => {
      const previous = cached.items.find((entry) => entry.id === item.id)
      if (previous && previous.nftVersion > item.nftVersion) {
        return { ...item, unitPriceEth: previous.unitPriceEth, available: previous.available, nftVersion: previous.nftVersion }
      }
      return item
    }),
  }
}

export function useCart() {
  const queryClient = useQueryClient()
  const { owner } = useSession()
  const cartKey = owner ? queryKeys.cart(owner) : (['cart', 'pending'] as const)
  const cart = useQuery({
    queryKey: cartKey,
    enabled: Boolean(owner),
    queryFn: async ({ signal }) => mergeCart(await cartApi.getCart(signal), queryClient.getQueryData<Cart>(cartKey)),
  })
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: cartKey })
  }
  const add = useMutation({
    mutationFn: cartApi.addCartItem,
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(apiErrorMessage(error)),
  })
  const setQuantity = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => cartApi.updateCartItem(id, quantity),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previous = queryClient.getQueryData<Cart>(cartKey)
      queryClient.setQueryData<Cart>(cartKey, (current) => {
        if (!current) return current
        return {
          ...current,
          items: current.items.map((item) => (item.id === id ? { ...item, quantity } : item)),
        }
      })
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(cartKey, context.previous)
      toast.error(apiErrorMessage(error))
    },
    onSettled: () => void invalidate(),
  })
  const remove = useMutation({
    mutationFn: cartApi.removeCartItem,
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(apiErrorMessage(error)),
  })
  const applyCoupon = useMutation({ mutationFn: cartApi.applyCoupon, onSuccess: () => void invalidate() })
  const removeCoupon = useMutation({ mutationFn: cartApi.removeCoupon, onSuccess: () => void invalidate() })
  return { ...cart, cart: cart.data, add, setQuantity, remove, applyCoupon, removeCoupon }
}
