import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { CartSummary } from '@/components/cart/cart-summary'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeading } from '@/components/common/page-heading'
import { Field } from '@/components/forms/field'
import { describedBy } from '@/lib/field-id'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/hooks/use-cart'
import { useSession } from '@/hooks/use-session'
import { createQuote } from '@/lib/api/cart'
import { apiErrorMessage, apiFieldErrors } from '@/lib/api-error'
import { clearRealtimeBanner, useRealtimeBanner } from '@/lib/announce'
import { queryKeys } from '@/lib/query-keys'
import { couponSchema } from '@/lib/schemas'
import { ART_HEIGHT, ART_WIDTH } from '@/mocks/fixtures'

export function CartPage() {
  const { cart, isLoading, isError, refetch, setQuantity, remove, applyCoupon, removeCoupon } = useCart()
  const { isAuthenticated, owner } = useSession()
  const banner = useRealtimeBanner()
  const couponForm = useForm<z.infer<typeof couponSchema>>({ resolver: zodResolver(couponSchema), defaultValues: { code: '' } })
  const quote = useQuery({
    queryKey: owner && cart ? queryKeys.quote(owner, cart.version, 'ethereum') : ['quote', 'idle'],
    enabled: Boolean(owner && cart && cart.items.length > 0),
    queryFn: ({ signal }) => createQuote('ethereum', signal),
  })

  if (isLoading) {
    return (
      <>
        <PageHeading title="Seu carrinho" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-40" />
          <Skeleton data-testid="cart-summary" className="h-56" />
        </div>
      </>
    )
  }
  if (isError) return <><PageHeading title="Seu carrinho" /><div role="alert"><Button onClick={() => void refetch()}>Tentar novamente</Button></div></>
  if (!cart?.items.length) {
    return (
      <>
        <PageHeading title="Seu carrinho" />
        <EmptyState title="Seu carrinho está vazio" description="Explore o catálogo e escolha sua próxima obra." />
      </>
    )
  }

  const couponError = couponForm.formState.errors.code?.message

  return (
    <>
      <PageHeading title="Seu carrinho" description={`${cart.items.length} ${cart.items.length === 1 ? 'obra selecionada' : 'obras selecionadas'}.`} />
      {banner ? (
        <div data-testid="realtime-banner" className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-[#F26B1D] bg-[#1C120E] p-4" role="status">
          <p>{banner}</p>
          <Button type="button" variant="ghost" size="sm" onClick={clearRealtimeBanner}>Dispensar</Button>
        </div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {cart.items.map((item) => {
            const max = item.available
            return (
              <Card key={item.id} data-testid="cart-item">
                <CardContent className="flex gap-4">
                  <img src={item.image} alt={item.name} width={ART_WIDTH} height={ART_HEIGHT} loading="lazy" decoding="async" className="size-24 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold">{item.name}</h2>
                    <p className="text-sm text-[#B8AA96]">{item.editionLabel}</p>
                    <p className="text-sm text-[#FF7A1A]">{item.unitPriceEth} ETH</p>
                    <p className="text-xs text-[#B8AA96]">Máximo disponível: {max}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" aria-label="Diminuir quantidade" disabled={item.quantity <= 1 || setQuantity.isPending} onClick={() => setQuantity.mutate({ id: item.id, quantity: item.quantity - 1 })}><Minus aria-hidden="true" className="size-4" /></Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button type="button" variant="outline" size="icon" aria-label="Aumentar quantidade" disabled={item.quantity >= max || setQuantity.isPending} onClick={() => setQuantity.mutate({ id: item.id, quantity: item.quantity + 1 })}><Plus aria-hidden="true" className="size-4" /></Button>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${item.name}`} onClick={() => remove.mutate(item.id)}><Trash2 aria-hidden="true" /></Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <aside className="space-y-4">
          <form
            className="space-y-2"
            onSubmit={couponForm.handleSubmit((values) => {
              couponForm.clearErrors('code')
              applyCoupon.mutate(values.code, {
                onSuccess: () => {
                  toast.success('Cupom aplicado.')
                  couponForm.reset()
                },
                onError: (error) => {
                  const fields = apiFieldErrors(error)
                  couponForm.setError('code', { message: fields.code ?? apiErrorMessage(error) })
                },
              })
            })}
          >
            <Field id="coupon" label="Cupom" error={couponError}>
              <div className="flex gap-2">
                <Input id="coupon" aria-invalid={Boolean(couponError)} aria-describedby={describedBy('coupon', couponError)} {...couponForm.register('code')} />
                <Button type="submit" variant="outline">Aplicar</Button>
              </div>
            </Field>
          </form>
          {cart.couponCode ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => removeCoupon.mutate(undefined, { onSuccess: () => toast.success('Cupom removido.') })}>
              Remover cupom {cart.couponCode}
            </Button>
          ) : null}
          {quote.isError ? (
            <div role="alert" className="text-sm text-[#FFD0C2]">
              <p>{apiErrorMessage(quote.error)}</p>
              <Button type="button" className="mt-3" variant="outline" onClick={() => void quote.refetch()}>Tentar novamente</Button>
            </div>
          ) : null}
          <CartSummary quote={quote.data} loading={quote.isLoading} updating={quote.isFetching && !quote.isLoading} />
          <Button className="w-full" asChild>
            {isAuthenticated
              ? <Link to="/pagamento">Ir para pagamento</Link>
              : <Link to="/login" search={{ redirect: '/pagamento' }}>Ir para pagamento</Link>}
          </Button>
        </aside>
      </div>
    </>
  )
}
