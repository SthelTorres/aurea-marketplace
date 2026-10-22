import type { Quote } from '@/shared/types'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export function CartSummary({ quote, loading, updating }: { quote?: Quote; loading?: boolean; updating?: boolean }) {
  return (
    <Card data-testid="cart-summary">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Resumo</h2>
          {updating ? <p className="text-xs text-[#B8AA96]">Atualizando…</p> : null}
        </div>
        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <>
            <div className="flex justify-between text-[#B8AA96]"><span>Subtotal</span><span>{quote?.subtotalEth ?? '—'} ETH</span></div>
            <div className="flex justify-between text-[#B8AA96]"><span>Desconto</span><span>-{quote?.discountEth ?? '0'} ETH</span></div>
            <div className="flex justify-between text-[#B8AA96]"><span>Taxa de rede</span><span>{quote?.networkFeeEth ?? '—'} ETH</span></div>
            <Separator />
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-[#FF7A1A]">{quote?.totalEth ?? '—'} ETH</span></div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
