import { NftGrid } from '@/components/nfts/nft-grid'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeading } from '@/components/common/page-heading'
import { useFavorites } from '@/hooks/use-favorites'
import type { Nft } from '@/shared/types'

export function FavoritesPage() {
  const { favorites, isLoading, isError, refetch, toggle } = useFavorites()
  const nfts = favorites.map((item) => item.nft).filter((nft): nft is Nft => Boolean(nft))
  return (
    <>
      <PageHeading title="Favoritos" description="Obras que você marcou para acompanhar." />
      {isLoading ? <NftGrid loading /> : null}
      {isError ? <ErrorState retry={() => void refetch()} /> : null}
      {!isLoading && !isError && nfts.length === 0 ? <EmptyState title="Nenhum favorito ainda" description="Explore o catálogo e salve as obras que mais combinam com você." /> : null}
      {!isLoading && !isError && nfts.length > 0 ? (
        <NftGrid nfts={nfts} favorites={favorites.map((item) => item.nftId)} onFavorite={(id) => toggle.mutate(id)} />
      ) : null}
    </>
  )
}
