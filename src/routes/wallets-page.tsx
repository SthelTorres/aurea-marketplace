import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ErrorState } from '@/components/common/error-state'
import { PageHeading } from '@/components/common/page-heading'
import { Field } from '@/components/forms/field'
import { describedBy } from '@/lib/field-id'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/hooks/use-session'
import { connectWallet, createWallet, disconnectWallet, listWallets, updateWallet } from '@/lib/api/wallets'
import { apiErrorMessage, apiFieldErrors } from '@/lib/api-error'
import { queryKeys } from '@/lib/query-keys'
import { walletSchema } from '@/lib/schemas'
import type { Wallet, WalletRole } from '@/shared/types'

const slots: { role: WalletRole; title: string }[] = [
  { role: 'primary', title: 'Carteira principal' },
  { role: 'secondary', title: 'Carteira secundária' },
]

export function WalletsPage() {
  const { session } = useSession()
  const userId = session?.user.id ?? ''
  const queryClient = useQueryClient()
  const wallets = useQuery({
    queryKey: queryKeys.wallets(userId),
    queryFn: ({ signal }) => listWallets(signal),
    enabled: Boolean(userId),
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
  if (wallets.isLoading) return <Skeleton className="h-80" />
  if (wallets.isError) return <ErrorState retry={() => void wallets.refetch()} />
  return (
    <>
      <PageHeading title="Carteiras" description="Cada colecionador tem uma carteira principal e uma secundária." />
      <div className="grid gap-6 lg:grid-cols-2">
        {slots.map((slot) => (
          <WalletSlot
            key={slot.role}
            title={slot.title}
            role={slot.role}
            wallet={wallets.data?.find((item) => item.role === slot.role)}
            onSaved={() => void invalidate()}
          />
        ))}
      </div>
    </>
  )
}

function WalletSlot({ title, role, wallet, onSaved }: { title: string; role: WalletRole; wallet?: Wallet; onSaved: () => void }) {
  const form = useForm<z.infer<typeof walletSchema>>({
    resolver: zodResolver(walletSchema),
    defaultValues: { label: wallet?.label ?? '', address: wallet?.address ?? '' },
  })
  useEffect(() => {
    form.reset({ label: wallet?.label ?? '', address: wallet?.address ?? '' })
  }, [wallet, form])
  const save = useMutation({
    mutationFn: (values: z.infer<typeof walletSchema>) => wallet
      ? updateWallet(wallet.id, values)
      : createWallet({ ...values, role }),
    onSuccess: () => {
      toast.success(wallet ? 'Carteira atualizada.' : 'Carteira cadastrada.')
      onSaved()
    },
    onError: (error) => {
      const fields = apiFieldErrors(error)
      if (fields.label) form.setError('label', { message: fields.label })
      if (fields.address) form.setError('address', { message: fields.address })
      if (fields.role) form.setError('root', { message: fields.role })
      if (!fields.label && !fields.address) form.setError('root', { message: apiErrorMessage(error) })
    },
  })
  const connect = useMutation({
    mutationFn: () => connectWallet(wallet?.id ?? ''),
    onSuccess: () => { toast.success('Carteira conectada.'); onSaved() },
    onError: (error) => form.setError('root', { message: apiErrorMessage(error) }),
  })
  const disconnect = useMutation({
    mutationFn: () => disconnectWallet(wallet?.id ?? ''),
    onSuccess: () => { toast.success('Carteira desconectada.'); onSaved() },
    onError: (error) => form.setError('root', { message: apiErrorMessage(error) }),
  })
  const errors = form.formState.errors
  const labelId = `${role}-label`
  const addressId = `${role}-address`
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          {wallet ? <Badge>{wallet.connected ? 'Conectada' : 'Desconectada'}</Badge> : <Badge>Vazia</Badge>}
        </div>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))}>
          {errors.root ? <p role="alert" className="text-sm text-[#FFD0C2]">{errors.root.message}</p> : null}
          <Field id={labelId} label="Nome" error={errors.label?.message}>
            <Input id={labelId} aria-invalid={Boolean(errors.label)} aria-describedby={describedBy(labelId, errors.label?.message)} {...form.register('label')} />
          </Field>
          <Field id={addressId} label="Endereço" error={errors.address?.message}>
            <Input id={addressId} spellCheck={false} aria-invalid={Boolean(errors.address)} aria-describedby={describedBy(addressId, errors.address?.message)} {...form.register('address')} />
          </Field>
          <Button type="submit" disabled={save.isPending}>{wallet ? 'Salvar alterações' : 'Cadastrar carteira'}</Button>
        </form>
        {wallet ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={wallet.connected || connect.isPending} onClick={() => connect.mutate()}>Conectar</Button>
            <Button type="button" variant="outline" disabled={!wallet.connected || disconnect.isPending} onClick={() => disconnect.mutate()}>Desconectar</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
