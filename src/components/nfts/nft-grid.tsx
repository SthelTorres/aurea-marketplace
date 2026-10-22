import type { Nft } from '@/shared/types'
import { NftCard } from './nft-card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'

interface Props {
  nfts?: Nft[]
  loading?: boolean
  favorites?: string[]
  onFavorite?: (id: string) => void
  favoriteRedirect?: string
  onAdd?: (nft: Nft) => void
}

export function NftGrid({ nfts, loading, favorites = [], onFavorite, favoriteRedirect, onAdd }: Props) {
  if (loading) {
    return (
      <div data-testid="catalog-skeletons" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-[3/4]" />)}
      </div>
    )
  }
  if (!nfts?.length) return <EmptyState title="Nenhuma obra encontrada" description="Altere os filtros para explorar outras criações." />
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {nfts.map((nft) => (
        <NftCard
          key={nft.id}
          nft={nft}
          favorite={favorites.includes(nft.id)}
          onFavorite={onFavorite ? () => onFavorite(nft.id) : undefined}
          favoriteRedirect={onFavorite ? undefined : favoriteRedirect}
          onAdd={onAdd ? () => onAdd(nft) : undefined}
        />
      ))}
    </div>
  )
}
