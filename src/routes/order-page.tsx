import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { ErrorState } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/hooks/use-session'
import { getOrder } from '@/lib/api/orders'
import { forgetPendingOrder } from '@/lib/pending-order'
import { queryKeys } from '@/lib/query-keys'
import type { Order } from '@/shared/types'
import { ART_HEIGHT, ART_WIDTH } from '@/mocks/fixtures'

const STATUS_LABEL = {
  pending: 'Pagamento pendente',
  confirmed: 'Pagamento confirmado',
  refused: 'Pagamento recusado',
} as const

export function OrderPage() {
  const { orderId } = useParams({ from: '/pedidos/$orderId' })
  const { session } = useSession()
  const userId = session?.user.id ?? ''
  const queryClient = useQueryClient()
  const key = queryKeys.order(userId, orderId)
  const order = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const fetched = await getOrder(orderId, signal)
      const cached = queryClient.getQueryData<Order>(key)
      if (!cached) return fetched
      if (cached.status === 'confirmed' || cached.status === 'refused') return cached
      if (cached.version > fetched.version) return cached
      return fetched
    },
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3_000 : false),
  })

  useEffect(() => {
    if (!userId || !order.data) return
    if (order.data.status !== 'pending') forgetPendingOrder(userId)
    document.title = `${STATUS_LABEL[order.data.status]} — Áurea`
  }, [order.data, userId])

  if (order.isLoading) return <Skeleton className="mx-auto h-96 max-w-2xl" />
  if (!order.data) return <ErrorState retry={() => void order.refetch()} />
  const data = order.data
  const Icon = data.status === 'confirmed' ? CheckCircle2 : data.status === 'refused' ? XCircle : Clock3

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <Icon aria-hidden="true" className="mx-auto size-14 text-[#FF7A1A]" />
        <h1 tabIndex={-1} className="mt-4 text-4xl font-black uppercase outline-none" data-testid="order-status">{STATUS_LABEL[data.status]}</h1>
        <p className="mt-2 text-[#B8AA96]">Pedido {data.id}</p>
      </div>
      {data.status === 'pending' ? <p className="mb-6 text-center text-[#B8AA96]">A confirmação chega pelo tempo real. Esta página também consulta o pedido a cada 3 segundos.</p> : null}
      {data.status === 'refused' ? (
        <div className="mb-6 text-center" role="alert">
          <p className="text-[#B8AA96]">Nenhum item foi removido do carrinho.</p>
          <Button className="mt-4" asChild><Link to="/carrinho">Tentar novamente no carrinho</Link></Button>
        </div>
      ) : null}
      {data.status === 'confirmed' ? <Receipt order={data} /> : null}
    </div>
  )
}

function Receipt({ order }: { order: Order }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-xl font-bold">Recibo</h2>
        <ul className="space-y-4">
          {order.items.map((item) => (
            <li key={item.editionId} className="flex gap-3">
              <img src={item.image} alt={item.name} width={ART_WIDTH} height={ART_HEIGHT} loading="lazy" decoding="async" className="size-16 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-[#B8AA96]">{item.editionLabel} · {item.quantity} × {item.unitPriceEth} ETH</p>
              </div>
            </li>
          ))}
        </ul>
        <Separator />
        <div className="space-y-2 text-sm text-[#B8AA96]">
          <p className="flex justify-between"><span>Subtotal</span><span>{order.subtotalEth} ETH</span></p>
          <p className="flex justify-between"><span>Desconto</span><span>-{order.discountEth} ETH</span></p>
          <p className="flex justify-between"><span>Taxa de rede</span><span>{order.networkFeeEth} ETH</span></p>
          <p className="flex justify-between text-base font-bold text-[#F8F0D8]"><span>Total</span><span>{order.totalEth} ETH</span></p>
          <p>Rede: {order.network === 'polygon' ? 'Polygon' : 'Ethereum'}</p>
          <p className="break-all">Carteira: {order.walletAddress}</p>
          <p>Colecionador: {order.collector.name} · {order.collector.email}</p>
          {order.txHash ? <p className="break-all">Transação: {order.txHash}</p> : null}
        </div>
        {order.explorerUrl ? (
          <a href={order.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex text-[#FF7A1A] underline-offset-4 hover:underline">
            Ver no explorador (simulado)
          </a>
        ) : null}
        <Button asChild><Link to="/">Continuar explorando</Link></Button>
      </CardContent>
    </Card>
  )
}
