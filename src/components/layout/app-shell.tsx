import { useEffect, useRef } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { LiveRegion } from '@/components/common/live-region'
import { DevPanel } from '@/components/dev/dev-panel'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

const TITLES: Record<string, string> = {
  '/': 'Áurea — Marketplace de NFTs',
  '/carrinho': 'Carrinho — Áurea',
  '/pagamento': 'Pagamento — Áurea',
  '/login': 'Entrar — Áurea',
  '/cadastro': 'Cadastro — Áurea',
  '/perfil': 'Perfil — Áurea',
  '/carteiras': 'Carteiras — Áurea',
  '/favoritos': 'Favoritos — Áurea',
}

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/nfts/')) return 'Obra — Áurea'
  if (pathname.startsWith('/pedidos/')) return 'Pedido — Áurea'
  return 'Página não encontrada — Áurea'
}

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const first = useRef(true)
  useEffect(() => {
    document.title = titleFor(pathname)
    if (first.current) {
      first.current = false
      return
    }
    const heading = document.querySelector<HTMLElement>('#conteudo h1')
    heading?.focus()
  }, [pathname])

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0B0706] text-[#F8F0D8]">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 outline-none md:px-8">
        <Outlet />
      </main>
      <SiteFooter />
      <LiveRegion />
      <DevPanel />
    </div>
  )
}
