import { Link } from '@tanstack/react-router'
import { LcpImage } from '@/components/nfts/lcp-image'
import { HERO_IMAGE } from '@/mocks/fixtures'
import { Button } from '@/components/ui/button'

export function FeaturedHero() {
  return (
    <section className="mb-12 grid items-center gap-8 overflow-hidden rounded-3xl border border-[#3A241C] bg-[#140C0A] p-6 md:p-10 lg:grid-cols-2">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#FF7A1A]">Coleção Áurea</p>
        <h1 tabIndex={-1} className="max-w-xl text-4xl font-black uppercase leading-[0.95] tracking-tight outline-none md:text-6xl">
          Seja dono do futuro da arte digital.
        </h1>
        <p className="mt-6 max-w-xl text-[#B8AA96]">Descubra obras únicas, conecte sua carteira e construa uma coleção que atravessa gerações.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <a href="#catalogo">Explorar agora</a>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/cadastro" search={{ redirect: undefined }}>Criar conta</Link>
          </Button>
        </div>
      </div>
      <LcpImage src="/images/hero-640.webp" alt={HERO_IMAGE.alt} className="aspect-square w-full rounded-3xl object-cover" />
    </section>
  )
}
