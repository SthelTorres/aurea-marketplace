import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Heart, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { LcpImage } from '@/components/nfts/lcp-image'
import { artPathFromId } from '@/mocks/fixtures'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/error-state'
import { useNft } from '@/hooks/use-catalog'
import { useFavorites } from '@/hooks/use-favorites'
import { useCart } from '@/hooks/use-cart'
import { useSession } from '@/hooks/use-session'
import { apiErrorMessage, isNotFound } from '@/lib/api-error'
import { CATEGORY_LABELS, type Nft } from '@/shared/types'

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nfts/$nftId' })
  const query = useNft(nftId)
  const { isAuthenticated } = useSession()
  const { favorites, toggle } = useFavorites()
  const { add } = useCart()
  useEffect(() => {
    if (query.data) document.title = `${query.data.name} — Áurea`
  }, [query.data])

  if (query.isLoading) {
    const preview = artPathFromId(nftId)
    return (
      <div className="grid gap-8 md:grid-cols-2" aria-busy="true">
        {preview ? (
          <LcpImage src={preview} alt="Carregando obra" className="aspect-square w-full rounded-3xl object-cover" />
        ) : <Skeleton className="aspect-square" />}
        <div className="space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-16" /><Skeleton className="h-28" /><Skeleton className="h-12" /></div>
      </div>
    )
  }
  if (query.isError && isNotFound(query.error)) {
    return (
      <div className="py-16 text-center">
        <h1 tabIndex={-1} className="text-4xl font-black uppercase outline-none">Obra não encontrada</h1>
        <p className="mt-3 text-[#B8AA96]">Essa obra não existe ou foi removida do catálogo.</p>
        <Button className="mt-8" asChild><Link to="/">Voltar ao catálogo</Link></Button>
      </div>
    )
  }
  if (!query.data || query.isError) return <ErrorState retry={() => void query.refetch()} />

  return <NftDetailView key={query.data.id} nft={query.data} favorite={favorites.some((item) => item.nftId === query.data.id)} isAuthenticated={isAuthenticated} onFavorite={() => toggle.mutate(query.data.id, { onError: (error) => toast.error(apiErrorMessage(error)) })} onAdd={(editionId, quantity) => add.mutate({ nftId, editionId, quantity }, { onSuccess: () => toast.success('Adicionado ao carrinho.'), onError: (error) => toast.error(apiErrorMessage(error)) })} pending={add.isPending} />
}

function NftDetailView({
  nft,
  favorite,
  isAuthenticated,
  onFavorite,
  onAdd,
  pending,
}: {
  nft: Nft
  favorite: boolean
  isAuthenticated: boolean
  onFavorite: () => void
  onAdd: (editionId: string, quantity: number) => void
  pending: boolean
}) {
  const [editionId, setEditionId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const nftId = nft.id
  const selectedId = editionId || nft.editions.find((edition) => edition.stock > 0)?.id || nft.editions[0]?.id || ''
  const edition = nft.editions.find((item) => item.id === selectedId)
  const available = edition?.stock ?? 0
  const images = nft.images
  const activeImage = images[imageIndex] ?? nft.imageUrl

  const changeEdition = (value: string) => {
    setEditionId(value)
    const next = nft.editions.find((item) => item.id === value)
    setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, next?.stock ?? 1)))
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-14">
      <div>
        <div className="overflow-hidden rounded-3xl bg-[#140C0A]">
          <LcpImage src={activeImage} alt={`${nft.name}, imagem ${imageIndex + 1}`} className="aspect-square w-full object-cover" />
        </div>
        <div role="tablist" aria-label="Galeria da obra" className="mt-4 flex gap-3" onKeyDown={(event) => {
          if (event.key === 'ArrowRight') setImageIndex((index) => (index + 1) % images.length)
          if (event.key === 'ArrowLeft') setImageIndex((index) => (index - 1 + images.length) % images.length)
        }}>
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={index === imageIndex}
              aria-label={`Mostrar imagem ${index + 1} de ${nft.name}`}
              className={`overflow-hidden rounded-xl border ${index === imageIndex ? 'border-[#F26B1D]' : 'border-[#3A241C]'}`}
              onClick={() => setImageIndex(index)}
            >
              <img src={src} alt={`${nft.name}, miniatura ${index + 1}`} width={96} height={96} loading="lazy" decoding="async" className="size-20 object-cover" />
            </button>
          ))}
        </div>
      </div>
      <div>
        <Badge>{CATEGORY_LABELS[nft.category]}</Badge>
        {nft.stock === 0 ? <Badge className="ml-2">Esgotada</Badge> : null}
        <h1 tabIndex={-1} className="mt-4 text-4xl font-black uppercase outline-none md:text-6xl">{nft.name}</h1>
        <p className="mt-3 text-sm text-[#B8AA96]">por {nft.creator}</p>
        <p className="mt-5 leading-7 text-[#B8AA96]">{nft.description}</p>
        <p className="mt-8 text-sm text-[#B8AA96]">Preço da edição</p>
        <p className="text-3xl font-black text-[#FF7A1A]">{edition?.priceEth ?? nft.priceEth} ETH</p>
        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="edition" className="mb-2 block text-sm font-medium">Edição</label>
            <Select value={selectedId} onValueChange={changeEdition}>
              <SelectTrigger id="edition" aria-label="Edição">
                <SelectValue placeholder="Selecione a edição" />
              </SelectTrigger>
              <SelectContent>
                {nft.editions.map((item) => (
                  <SelectItem key={item.id} value={item.id} disabled={item.stock === 0}>
                    {item.label} — {item.priceEth} ETH {item.stock === 0 ? '— Esgotada' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p id="qty-label" className="mb-2 text-sm font-medium">Quantidade</p>
            <div className="flex items-center gap-3" role="group" aria-labelledby="qty-label">
              <Button type="button" variant="outline" size="icon" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus aria-hidden="true" className="size-4" /></Button>
              <span className="w-8 text-center font-bold" aria-live="polite">{quantity}</span>
              <Button type="button" variant="outline" size="icon" aria-label="Aumentar quantidade" disabled={available <= 0 || quantity >= available} onClick={() => setQuantity((value) => Math.min(available, value + 1))}><Plus aria-hidden="true" className="size-4" /></Button>
            </div>
            <p className="mt-2 text-sm text-[#B8AA96]">Máximo disponível: {available}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1"
            disabled={available <= 0 || pending}
            onClick={() => onAdd(selectedId, quantity)}
          >
            Adicionar ao carrinho
          </Button>
          {isAuthenticated ? (
            <Button variant="outline" size="icon" aria-pressed={favorite} aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onClick={onFavorite}>
              <Heart aria-hidden="true" className={favorite ? 'fill-[#F26B1D] text-[#F26B1D]' : ''} />
            </Button>
          ) : (
            <Button variant="outline" size="icon" asChild>
              <Link to="/login" search={{ redirect: `/nfts/${nftId}` }} aria-label="Adicionar aos favoritos"><Heart aria-hidden="true" /></Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
