import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { CartSummary } from '@/components/cart/cart-summary'
import { ErrorState } from '@/components/common/error-state'
import { PageHeading } from '@/components/common/page-heading'
import { Field } from '@/components/forms/field'
import { describedBy } from '@/lib/field-id'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCart } from '@/hooks/use-cart'
import { useSession } from '@/hooks/use-session'
import { createQuote } from '@/lib/api/cart'
import { createOrder } from '@/lib/api/orders'
import { connectWallet, disconnectWallet, listWallets } from '@/lib/api/wallets'
import { apiErrorBody, apiErrorMessage, apiFieldErrors, isTimeoutError } from '@/lib/api-error'
import { clearCheckoutDraft, readCheckoutDraft, writeCheckoutDraft } from '@/lib/checkout-draft'
import { clearIdempotencyKey, idempotencyKeyFor } from '@/lib/idempotency'
import { forgetPendingOrder, rememberPendingOrder } from '@/lib/pending-order'
import { queryKeys } from '@/lib/query-keys'
import { checkoutSchema } from '@/lib/schemas'
import type { CreateOrderBody, Order, Quote } from '@/shared/types'

type CheckoutValues = z.infer<typeof checkoutSchema>

export function PaymentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session, owner } = useSession()
  const { cart } = useCart()
  const draft = readCheckoutDraft()
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: draft?.name || session?.user.name || '',
      email: draft?.email || session?.user.email || '',
      walletId: draft?.walletId || '',
      network: draft?.network || 'ethereum',
      acceptTerms: draft?.acceptTerms === true ? true : undefined as unknown as true,
    },
  })
  const [network, setNetwork] = useState<CheckoutValues['network']>(draft?.network || 'ethereum')
  const [walletId, setWalletId] = useState(draft?.walletId || '')
  const quoteQuery = useQuery({
    queryKey: owner && cart ? queryKeys.quote(owner, cart.version, network) : ['quote', 'payment-idle'],
    enabled: Boolean(owner && cart && cart.items.length > 0),
    queryFn: ({ signal }) => createQuote(network, signal),
  })
  const wallets = useQuery({
    queryKey: session ? queryKeys.wallets(session.user.id) : ['wallets', 'none'],
    queryFn: ({ signal }) => listWallets(signal),
    enabled: Boolean(session),
  })
  const [step, setStep] = useState<'form' | 'review'>(draft?.name ? 'form' : 'form')
  const [snapshot, setSnapshot] = useState<Quote | null>(null)
  const [diff, setDiff] = useState<Quote | null>(null)
  const [stockMessage, setStockMessage] = useState('')
  const [formAlert, setFormAlert] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const lock = useRef(false)

  const saveDraft = () => {
    const values = form.getValues()
    writeCheckoutDraft({
      name: values.name ?? '',
      email: values.email ?? '',
      walletId: values.walletId ?? '',
      network: values.network === 'polygon' ? 'polygon' : 'ethereum',
      acceptTerms: values.acceptTerms === true,
    })
  }

  useEffect(() => {
    if (!session) return
    if (!form.getValues('name')) form.setValue('name', session.user.name)
    if (!form.getValues('email')) form.setValue('email', session.user.email)
  }, [session, form])

  if (!cart) return <div className="h-80 animate-pulse rounded-2xl bg-[#1C120E]" />
  if (cart.items.length === 0) {
    return (
      <>
        <PageHeading title="Finalizar aquisição" />
        <ErrorState title="Carrinho vazio" description="Adicione uma obra antes de pagar." retry={() => void navigate({ to: '/carrinho' })} />
      </>
    )
  }

  const selectedWallet = wallets.data?.find((wallet) => wallet.id === walletId)
  const errors = form.formState.errors

  const goToOrder = async (order: Order) => {
    clearIdempotencyKey()
    clearCheckoutDraft()
    if (!session) return
    if (order.status === 'pending') rememberPendingOrder(session.user.id, order.id)
    else forgetPendingOrder(session.user.id)
    await queryClient.invalidateQueries({ queryKey: queryKeys.cart({ type: 'user', id: session.user.id }) })
    await navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
  }

  const send = async (body: CreateOrderBody): Promise<Order> => {
    const key = idempotencyKeyFor(body)
    try {
      return await createOrder(body, key)
    } catch (error) {
      if (!isTimeoutError(error)) throw error
      try {
        return await createOrder(body, key)
      } catch (retryError) {
        if (!isTimeoutError(retryError)) throw retryError
        let last = retryError
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await new Promise((resolve) => { window.setTimeout(resolve, 1_000) })
          try {
            return await createOrder(body, key)
          } catch (pollError) {
            last = pollError
            if (!isTimeoutError(pollError)) throw pollError
          }
        }
        throw last
      }
    }
  }

  const confirm = async () => {
    if (!snapshot || lock.current || !session) return
    const wallet = wallets.data?.find((item) => item.id === form.getValues('walletId'))
    if (!wallet?.connected) {
      setFormAlert('Conecte a carteira antes de confirmar.')
      return
    }
    lock.current = true
    setSubmitting(true)
    setFormAlert('')
    const body: CreateOrderBody = {
      quoteId: snapshot.id,
      network: snapshot.network,
      walletId: wallet.id,
      collector: { name: form.getValues('name'), email: form.getValues('email') },
    }
    try {
      const order = await send(body)
      await goToOrder(order)
    } catch (error) {
      const payload = apiErrorBody(error)
      if (payload?.code === 'QUOTE_CHANGED' && payload.details?.quote) {
        setDiff(payload.details.quote)
      } else if (payload?.code === 'OUT_OF_STOCK') {
        setStockMessage(payload.details?.fields?.quantity ?? payload.message)
      } else {
        setFormAlert(apiErrorMessage(error))
      }
    } finally {
      lock.current = false
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeading title="Finalizar aquisição" description={step === 'form' ? 'Passo 1 de 2 — dados da compra' : 'Passo 2 de 2 — revisão'} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {step === 'form' ? (
          <Card>
            <CardContent>
              <form
                className="space-y-5"
                noValidate
                onChange={saveDraft}
                onSubmit={form.handleSubmit((values) => {
                  const wallet = wallets.data?.find((item) => item.id === values.walletId)
                  if (!wallet) {
                    form.setError('walletId', { message: 'Selecione uma carteira.' })
                    return
                  }
                  if (!wallet.connected) {
                    form.setError('walletId', { message: 'Conecte a carteira antes de continuar.' })
                    return
                  }
                  if (!quoteQuery.data) {
                    setFormAlert('Aguarde a cotação antes de revisar.')
                    return
                  }
                  setSnapshot(quoteQuery.data)
                  setStep('review')
                })}
              >
                {formAlert ? <p role="alert" className="text-sm text-[#FFD0C2]">{formAlert}</p> : null}
                <Field id="collector-name" label="Nome completo" error={errors.name?.message}>
                  <Input id="collector-name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('collector-name', errors.name?.message)} {...form.register('name')} />
                </Field>
                <Field id="collector-email" label="E-mail" error={errors.email?.message}>
                  <Input id="collector-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('collector-email', errors.email?.message)} {...form.register('email')} />
                </Field>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Carteira</legend>
                  {errors.walletId ? <p id="wallet-error" className="mb-2 text-sm text-[#FFD0C2]">{errors.walletId.message}</p> : null}
                  <div className="space-y-3">
                    {wallets.data?.map((wallet) => (
                      <div key={wallet.id} className="rounded-2xl border border-[#3A241C] p-3">
                        <label className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="walletId"
                            value={wallet.id}
                            checked={walletId === wallet.id}
                            aria-invalid={Boolean(errors.walletId)}
                            aria-describedby={errors.walletId ? 'wallet-error' : undefined}
                            onChange={() => { form.setValue('walletId', wallet.id, { shouldValidate: true }); setWalletId(wallet.id) }}
                          />
                          <span>
                            <span className="block font-semibold">{wallet.role === 'primary' ? 'Carteira principal' : 'Carteira secundária'}</span>
                            <span className="block text-sm text-[#B8AA96]">{wallet.label}</span>
                            <span className="block break-all text-sm text-[#B8AA96]">{wallet.address}</span>
                            <span className="mt-1 block text-sm">{wallet.connected ? 'Conectada' : 'Desconectada'}</span>
                          </span>
                        </label>
                        <div className="mt-3 flex gap-2">
                          <Button type="button" size="sm" variant="outline" disabled={wallet.connected} onClick={() => {
                            void connectWallet(wallet.id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.wallets(session?.user.id ?? '') })).catch((error: unknown) => {
                              form.setError('walletId', { message: apiFieldErrors(error).walletId ?? apiErrorMessage(error) })
                            })
                          }}>Conectar</Button>
                          <Button type="button" size="sm" variant="outline" disabled={!wallet.connected} onClick={() => {
                            void disconnectWallet(wallet.id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.wallets(session?.user.id ?? '') }))
                          }}>Desconectar</Button>
                        </div>
                      </div>
                    ))}
                    {wallets.data?.length === 0 ? <p className="text-sm text-[#B8AA96]">Cadastre uma carteira em <Link to="/carteiras" className="text-[#FF7A1A]">Carteiras</Link>.</p> : null}
                  </div>
                </fieldset>
                <div>
                  <Label htmlFor="network">Rede</Label>
                  <Controller
                    control={form.control}
                    name="network"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value: CheckoutValues['network']) => { field.onChange(value); setNetwork(value); saveDraft() }}>
                        <SelectTrigger id="network" aria-invalid={Boolean(errors.network)} aria-describedby={describedBy('network', errors.network?.message)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ethereum">Ethereum</SelectItem>
                          <SelectItem value="polygon">Polygon</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.network ? <p id="network-error" className="mt-1 text-sm text-[#FFD0C2]">{errors.network.message}</p> : null}
                </div>
                <div className="flex items-start gap-3">
                  <Controller
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <Checkbox
                        id="terms"
                        checked={field.value === true}
                        onCheckedChange={(checked) => { field.onChange(checked === true); saveDraft() }}
                        aria-invalid={Boolean(errors.acceptTerms)}
                        aria-describedby={describedBy('terms', errors.acceptTerms?.message)}
                      />
                    )}
                  />
                  <Label htmlFor="terms">Li e aceito os termos de aquisição</Label>
                </div>
                {errors.acceptTerms ? <p id="terms-error" className="text-sm text-[#FFD0C2]">{errors.acceptTerms.message}</p> : null}
                <Button type="submit" className="w-full" disabled={quoteQuery.isLoading}>Revisar pedido</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-xl font-bold">Revise antes de confirmar</h2>
              {formAlert ? <p role="alert" className="text-sm text-[#FFD0C2]">{formAlert}</p> : null}
              {stockMessage ? (
                <div role="alert" className="space-y-3 text-sm text-[#FFD0C2]">
                  <p>{stockMessage}</p>
                  <Button type="button" variant="outline" asChild><Link to="/carrinho">Voltar ao carrinho</Link></Button>
                </div>
              ) : null}
              <dl className="space-y-2 text-sm text-[#B8AA96]">
                <div className="flex justify-between gap-4"><dt>Nome</dt><dd className="text-[#F8F0D8]">{form.getValues('name')}</dd></div>
                <div className="flex justify-between gap-4"><dt>E-mail</dt><dd className="text-[#F8F0D8]">{form.getValues('email')}</dd></div>
                <div className="flex justify-between gap-4"><dt>Carteira</dt><dd className="break-all text-right text-[#F8F0D8]">{selectedWallet?.address}</dd></div>
                <div className="flex justify-between gap-4"><dt>Rede</dt><dd className="text-[#F8F0D8]">{snapshot?.network === 'polygon' ? 'Polygon' : 'Ethereum'}</dd></div>
              </dl>
              <ul className="space-y-2 text-sm">
                {snapshot?.items.map((item) => (
                  <li key={item.editionId} className="flex justify-between gap-3">
                    <span>{item.name} · {item.editionLabel} · {item.quantity}</span>
                    <span>{item.unitPriceEth} ETH</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep('form')}>Voltar</Button>
                <Button type="button" className="flex-1" data-testid="confirm-order" disabled={submitting} onClick={() => void confirm()}>
                  {submitting ? 'Confirmando…' : 'Confirmar compra'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {quoteQuery.isFetching && !quoteQuery.isLoading ? <p className="text-sm text-[#B8AA96]">Atualizando…</p> : null}
          <CartSummary quote={step === 'review' ? snapshot ?? undefined : quoteQuery.data} loading={quoteQuery.isLoading} updating={quoteQuery.isFetching && !quoteQuery.isLoading} />
        </div>
      </div>
      <Dialog open={Boolean(diff)} onOpenChange={(open) => { if (!open) setDiff(null) }}>
        <DialogContent>
          <DialogTitle>A cotação mudou</DialogTitle>
          <DialogDescription>Compare os valores e aceite a nova cotação antes de confirmar de novo.</DialogDescription>
          {snapshot && diff ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex justify-between"><span>Total anterior</span><span>{snapshot.totalEth} ETH</span></p>
              <p className="flex justify-between"><span>Novo total</span><span>{diff.totalEth} ETH</span></p>
              <ul className="space-y-2">
                {snapshot.items.map((item) => {
                  const next = diff.items.find((entry) => entry.editionId === item.editionId)
                  return (
                    <li key={item.editionId}>
                      {item.name}: {item.unitPriceEth} ETH → {next?.unitPriceEth ?? '—'} ETH
                    </li>
                  )
                })}
              </ul>
              <Button type="button" onClick={() => { setSnapshot(diff); setDiff(null) }}>Aceitar nova cotação</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
