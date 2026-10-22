import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircle, Menu, ShoppingBag, UserRound, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DrawerContent } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useCart } from '@/hooks/use-cart'
import { useSession } from '@/hooks/use-session'
import { useSocketStatus } from '@/hooks/use-socket-status'
import { getOrder } from '@/lib/api/orders'
import { forgetPendingOrder, pendingOrderId } from '@/lib/pending-order'
import { queryKeys } from '@/lib/query-keys'

function SocketStatus() {
  const status = useSocketStatus()
  const online = status === 'connected'
  const label = online ? 'Tempo real conectado' : 'Tempo real reconectando'
  const Icon = online ? Wifi : status === 'reconnecting' ? WifiOff : LoaderCircle
  return (
    <p data-testid="socket-status" className="flex items-center gap-1 text-xs text-[#B8AA96]">
      <Icon aria-hidden="true" className="size-3.5" />
      <span>{label}</span>
    </p>
  )
}

function PendingOrderLink() {
  const { session } = useSession()
  const userId = session?.user.id
  const [orderId, setOrderId] = useState<string | null>(null)
  useEffect(() => {
    if (!userId) return undefined
    const read = () => setOrderId(pendingOrderId(userId))
    read()
    window.addEventListener('aurea-pending-order', read)
    return () => window.removeEventListener('aurea-pending-order', read)
  }, [userId])
  const order = useQuery({
    queryKey: userId && orderId ? queryKeys.order(userId, orderId) : ['order', 'none'],
    queryFn: () => getOrder(orderId ?? ''),
    enabled: Boolean(userId && orderId),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3_000 : false),
  })
  useEffect(() => {
    if (userId && order.data && order.data.status !== 'pending') forgetPendingOrder(userId)
  }, [order.data, userId])
  if (!orderId || (order.data && order.data.status !== 'pending')) return null
  return (
    <Link to="/pedidos/$orderId" params={{ orderId }} className="text-sm font-semibold text-[#FF7A1A] underline-offset-4 hover:underline">
      Você tem um pedido pendente
    </Link>
  )
}

function NavLinks({ onNavigate, favorites }: { onNavigate?: () => void; favorites: boolean }) {
  const item = 'rounded-lg px-2 py-2 text-sm hover:text-[#FF7A1A]'
  return (
    <>
      <Link to="/" className={item} onClick={onNavigate}>Explorar</Link>
      {favorites ? <Link to="/favoritos" className={item} onClick={onNavigate}>Favoritos</Link> : null}
      {favorites ? <Link to="/perfil" className={item} onClick={onNavigate}>Perfil</Link> : null}
      {favorites ? <Link to="/carteiras" className={item} onClick={onNavigate}>Carteiras</Link> : null}
    </>
  )
}

export function SiteHeader() {
  const { cart } = useCart()
  const { session, logout } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  return (
    <header className="sticky top-0 z-30 border-b border-[#2C1A14] bg-[#0B0706]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:h-20 md:flex-nowrap md:px-8">
        <Link to="/" className="text-2xl font-black tracking-tight text-[#F8F0D8]">ÁUREA<span className="text-[#F26B1D]">.</span></Link>
        <nav aria-label="Principal" className="ml-4 hidden items-center gap-4 md:flex">
          <NavLinks favorites={Boolean(session)} />
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SocketStatus />
          <Link to="/carrinho" data-testid="header-cart" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`} className="relative rounded-full p-2">
            <ShoppingBag aria-hidden="true" />
            <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-[#F26B1D] px-1 text-[10px] font-bold text-[#1A0C08]">{count}</span>
          </Link>
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Abrir menu da conta">
                  <UserRound aria-hidden="true" className="size-4" />
                  <span className="hidden sm:inline">{session.user.name.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/perfil">Perfil</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/carteiras">Carteiras</Link></DropdownMenuItem>
                <DropdownMenuItem onSelect={() => logout.mutate()}>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild><Link to="/login" search={{ redirect: undefined }}>Entrar</Link></Button>
          )}
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DrawerContent side="right" aria-label="Menu">
              <p className="text-lg font-black">ÁUREA.</p>
              <nav aria-label="Menu móvel" className="mt-6 flex flex-col">
                <NavLinks favorites={Boolean(session)} onNavigate={() => setMenuOpen(false)} />
                <Link to="/carrinho" className="rounded-lg px-2 py-2 text-sm" onClick={() => setMenuOpen(false)}>Carrinho</Link>
                {session ? (
                  <button type="button" className="rounded-lg px-2 py-2 text-left text-sm" onClick={() => { setMenuOpen(false); logout.mutate() }}>Sair</button>
                ) : (
                  <Link to="/login" search={{ redirect: undefined }} className="rounded-lg px-2 py-2 text-sm" onClick={() => setMenuOpen(false)}>Entrar</Link>
                )}
              </nav>
            </DrawerContent>
          </Dialog>
        </div>
        <div className="basis-full md:basis-auto md:ml-4">
          <PendingOrderLink />
        </div>
      </div>
    </header>
  )
}
