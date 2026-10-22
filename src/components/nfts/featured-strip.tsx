import type { Nft } from '@/shared/types'
import { NftCard } from '@/components/nfts/nft-card'

interface Props {
  nfts: Nft[]
  favorites: string[]
  onFavorite?: (id: string) => void
  favoriteRedirect?: string
  onAdd?: (nft: Nft) => void
}

export function FeaturedStrip({ nfts, favorites, onFavorite, favoriteRedirect, onAdd }: Props) {
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin] md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:snap-none lg:grid-cols-5 xl:gap-6 [&::-webkit-scrollbar]:h-1.5">
      {nfts.map((nft) => (
        <div key={nft.id} className="w-[min(16rem,78vw)] shrink-0 snap-start md:w-auto md:min-w-0">
          <NftCard
            nft={nft}
            favorite={favorites.includes(nft.id)}
            onFavorite={onFavorite ? () => onFavorite(nft.id) : undefined}
            favoriteRedirect={onFavorite ? undefined : favoriteRedirect}
            onAdd={onAdd ? () => onAdd(nft) : undefined}
          />
        </div>
      ))}
    </div>
  )
}
