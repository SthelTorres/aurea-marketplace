import { useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import { FeaturedHero } from '@/components/nfts/featured-hero'
import { CatalogFilters } from '@/components/nfts/catalog-filters'
import { FeaturedStrip } from '@/components/nfts/featured-strip'
import { NftGrid } from '@/components/nfts/nft-grid'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DrawerContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/error-state'
import { useCatalog } from '@/hooks/use-catalog'
import { useFavorites } from '@/hooks/use-favorites'
import { useCart } from '@/hooks/use-cart'
import { useSession } from '@/hooks/use-session'
import { apiErrorMessage } from '@/lib/api-error'
import { toast } from 'sonner'
import type { CatalogFilters as Filters, Nft } from '@/shared/types'

export function HomePage() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const filters = useMemo<Filters>(() => ({ ...search, pageSize: search.pageSize ?? 12 }), [search])
  const catalog = useCatalog(filters)
  const featuredQuery = useCatalog({ pageSize: 24, sort: 'newest' })
  const { isAuthenticated } = useSession()
  const { favorites, toggle } = useFavorites()
  const { add } = useCart()
  const featured = featuredQuery.data?.data.filter((nft) => nft.featured) ?? []
  const change = (next: Filters) => { void navigate({ search: { ...next, pageSize: undefined } }) }
  const page = search.page ?? 1
  const totalPages = catalog.data?.pagination.totalPages ?? 0

  const addNft = (nft: Nft) => {
    const edition = nft.editions.find((item) => item.stock > 0)
    if (!edition) return
    add.mutate({ nftId: nft.id, editionId: edition.id, quantity: 1 }, { onSuccess: () => toast.success(`${nft.name} adicionado ao carrinho.`) })
  }

  return (
    <>
      <FeaturedHero />
      <section className="mb-12" aria-labelledby="destaques-titulo">
        <h2 id="destaques-titulo" className="mb-4 text-2xl font-black uppercase tracking-tight">Destaques</h2>
        {featuredQuery.isLoading ? (
          <div className="flex gap-4 overflow-hidden md:grid md:grid-cols-3 lg:grid-cols-5" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="aspect-[3/4] w-[min(16rem,78vw)] shrink-0 md:w-auto" />
            ))}
          </div>
        ) : featuredQuery.isError ? (
          <ErrorState retry={() => void featuredQuery.refetch()} />
        ) : (
          <FeaturedStrip
            nfts={featured}
            favorites={favorites.map((item) => item.nftId)}
            onFavorite={isAuthenticated ? (id) => toggle.mutate(id, { onError: (error) => toast.error(apiErrorMessage(error)) }) : undefined}
            favoriteRedirect="/"
            onAdd={addNft}
          />
        )}
      </section>
      <section id="catalogo">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Catálogo</h2>
            {catalog.isFetching && !catalog.isLoading ? <p className="text-sm text-[#B8AA96]">Atualizando…</p> : null}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="md:hidden" type="button">
                <SlidersHorizontal aria-hidden="true" className="size-4" /> Filtros
              </Button>
            </DialogTrigger>
            <DrawerContent side="right" aria-label="Filtros">
              <DialogTitle className="text-xl font-bold">Filtros</DialogTitle>
              <div className="mt-6"><CatalogFilters idPrefix="drawer" value={filters} onChange={change} /></div>
            </DrawerContent>
          </Dialog>
        </div>
        <div className="md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:gap-8">
          <aside className="hidden md:block">
            <div className="sticky top-24 rounded-2xl border border-[#3A241C] bg-[#140C0A] p-4">
              <h3 className="mb-4 font-bold uppercase tracking-wide">Filtros</h3>
              <CatalogFilters idPrefix="sidebar" value={filters} onChange={change} />
            </div>
          </aside>
          <div className="min-w-0">
            {catalog.isError ? <ErrorState retry={() => void catalog.refetch()} /> : (
              <NftGrid
                nfts={catalog.data?.data}
                loading={catalog.isLoading}
                favorites={favorites.map((item) => item.nftId)}
                onFavorite={isAuthenticated ? (id) => toggle.mutate(id, { onError: (error) => toast.error(apiErrorMessage(error)) }) : undefined}
                favoriteRedirect={`/?${new URLSearchParams(Object.entries(search).flatMap(([key, item]) => item === undefined ? [] : [[key, String(item)]])).toString()}`}
                onAdd={addNft}
              />
            )}
            {totalPages > 1 ? (
              <nav aria-label="Paginação" className="mt-8 flex flex-wrap justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                  <Button
                    key={number}
                    type="button"
                    variant={number === page ? 'default' : 'outline'}
                    size="sm"
                    aria-current={number === page ? 'page' : undefined}
                    onClick={() => void navigate({ search: { ...search, page: number } })}
                  >
                    {number}
                  </Button>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}
