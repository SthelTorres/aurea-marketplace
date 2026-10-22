import { Heart, ShoppingBag } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Nft } from '@/shared/types'
import { CATEGORY_LABELS } from '@/shared/types'
import { ART_HEIGHT, ART_WIDTH } from '@/mocks/fixtures'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function NftCard({
  nft,
  favorite,
  onFavorite,
  favoriteRedirect,
  onAdd,
}: {
  nft: Nft
  favorite?: boolean
  onFavorite?: () => void
  favoriteRedirect?: string
  onAdd?: () => void
}) {
  const soldOut = nft.stock <= 0
  return (
    <Card data-testid="nft-card" data-nft-id={nft.id} className="group overflow-hidden">
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} aria-label={`Ver ${nft.name}`}>
        <div className="relative aspect-square overflow-hidden bg-[#1C120E]">
          <img
            src={nft.imageUrl}
            alt={nft.name}
            width={ART_WIDTH}
            height={ART_HEIGHT}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        </div>
      </Link>
      <CardContent>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge>{CATEGORY_LABELS[nft.category]}</Badge>
            {soldOut ? <Badge className="ml-2">Esgotada</Badge> : null}
            <h2 className="mt-2 truncate text-lg font-bold">{nft.name}</h2>
          </div>
          {onFavorite ? (
            <Button variant="ghost" size="icon" aria-pressed={favorite} aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onClick={onFavorite}>
              <Heart aria-hidden="true" className={favorite ? 'fill-[#F26B1D] text-[#F26B1D]' : ''} />
            </Button>
          ) : favoriteRedirect ? (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/login" search={{ redirect: favoriteRedirect }} aria-label="Adicionar aos favoritos">
                <Heart aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-xs text-[#B8AA96]">Preço</span>
            <p className="font-bold text-[#FF7A1A]">{nft.priceEth} ETH</p>
          </div>
          {onAdd ? (
            <Button size="icon" onClick={onAdd} disabled={soldOut} aria-label={soldOut ? `${nft.name} esgotada` : `Adicionar ${nft.name} ao carrinho`}>
              <ShoppingBag aria-hidden="true" className="size-5" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
