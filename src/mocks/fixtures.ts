import { hashPassword } from '@/shared/password'
import { formatEth, minEth } from '@/shared/money'
import type { Coupon, Nft, NftCategory, User, Wallet } from '@/shared/types'

export interface SeedUser extends User {
  passwordHash: string
}

export const ART_WIDTH = 600
export const ART_HEIGHT = 600
export const HERO_IMAGE = {
  src: '/images/hero.webp',
  width: 1200,
  height: 1200,
  alt: 'Obra monumental da coleção Áurea em tons de âmbar e negro',
} as const

const EPOCH = '2026-01-15T12:00:00.000Z'
const categories: NftCategory[] = ['Rare', 'Common', 'Legendary', 'Epic']
const creators = ['Ateliê Áurea', 'Estúdio Lumina', 'Casa Nova Era', 'Oficina Solar']
const names = [
  'Aurora Dourada', 'Guardião Solar', 'Oráculo de Cristal', 'Nebulosa Áurea',
  'Fênix Imperial', 'Portal Celeste', 'Dragão de Ônix', 'Jardim Cósmico',
  'Relíquia Lunar', 'Coroa Estelar', 'Sentinela Rubi', 'Horizonte Digital',
  'Titã Esmeralda', 'Eclipse Violeta', 'Máscara Ancestral', 'Onda Quântica',
  'Lótus Infinito', 'Constelação Primeva', 'Chama Azul', 'Templo Suspenso',
  'Vórtice Carmesim', 'Alma Mecânica', 'Soberano do Éter', 'Gênese Dourada',
]

const featuredIds = new Set(['nft-01', 'nft-05', 'nft-09', 'nft-14', 'nft-18'])

export function artPath(nftIndex1Based: number): string {
  const slot = ((nftIndex1Based - 1) % 12) + 1
  return `/images/nfts/art-${String(slot).padStart(2, '0')}.webp`
}

export function artPathFromId(nftId: string): string | undefined {
  const match = /^nft-(\d+)$/.exec(nftId)
  if (!match) return undefined
  return artPath(Number(match[1]))
}

export function galleryFor(nftIndex1Based: number): [string, string, string] {
  return [artPath(nftIndex1Based), artPath(nftIndex1Based + 4), artPath(nftIndex1Based + 8)]
}

function editionPrice(index: number, extraUnits: bigint): string {
  const base = 8_000_000n + BigInt(index) * 3_500_000n
  return formatEth(base + extraUnits)
}

export const seedNfts: Nft[] = names.map((name, index) => {
  const number = index + 1
  const id = `nft-${String(number).padStart(2, '0')}`
  const images = galleryFor(number)
  const soldOut = number === 24
  const editionCount = index % 2 === 0 ? 3 : 2
  const editions = Array.from({ length: editionCount }, (_, editionIndex) => {
    const editionNumber = editionIndex + 1
    const extras = [0n, 5_000_000n, 12_000_000n] as const
    let stock = editionIndex === 0
      ? (index % 5) + 1
      : editionIndex === 1
        ? (index % 6 === 0 ? 0 : (index % 3) + 1)
        : (index % 5 === 0 ? 0 : 2)
    if (soldOut) stock = 0
    return {
      id: `${id}-edition-${editionNumber}`,
      nftId: id,
      number: editionNumber,
      label: `Edição ${editionNumber}`,
      stock,
      priceEth: editionPrice(index, extras[editionIndex] ?? 0n),
    }
  })
  const priced = editions.filter((edition) => edition.stock > 0)
  const priceEth = minEth((priced.length > 0 ? priced : editions).map((edition) => edition.priceEth))
  return {
    id,
    name,
    description: `${name} é uma obra digital exclusiva da coleção Áurea, criada para celebrar arte, raridade e inovação.`,
    category: categories[index % categories.length] ?? 'Rare',
    creator: creators[index % creators.length] ?? 'Ateliê Áurea',
    priceEth,
    stock: editions.reduce((total, edition) => total + edition.stock, 0),
    imageUrl: images[0],
    images,
    editions,
    featured: featuredIds.has(id),
    version: 1,
    createdAt: new Date(Date.parse(EPOCH) - index * 86_400_000).toISOString(),
    updatedAt: EPOCH,
  }
})

export const seedUsers: SeedUser[] = [
  {
    id: 'user-colecionador',
    name: 'Colecionador Áurea',
    email: 'colecionador@aurea.dev',
    passwordHash: hashPassword('Senha@123'),
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
  {
    id: 'user-colecionadora',
    name: 'Colecionadora Áurea',
    email: 'colecionadora@aurea.dev',
    passwordHash: hashPassword('Senha@123'),
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
]

export const seedWallets: Wallet[] = [
  {
    id: 'wallet-01',
    userId: 'user-colecionador',
    label: 'Cofre principal',
    address: `0x${'a'.repeat(40)}`,
    role: 'primary',
    connected: false,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
  {
    id: 'wallet-02',
    userId: 'user-colecionador',
    label: 'Cofre de reserva',
    address: `0x${'b'.repeat(40)}`,
    role: 'secondary',
    connected: false,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
  {
    id: 'wallet-03',
    userId: 'user-colecionadora',
    label: 'Cofre principal',
    address: `0x${'c'.repeat(40)}`,
    role: 'primary',
    connected: false,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  },
]

export const seedCoupons: Coupon[] = [
  { code: 'AUREA10', discountPercent: 10, active: true, expiresAt: '2099-12-31T23:59:59.999Z' },
  { code: 'EXPIRADO', discountPercent: 20, active: true, expiresAt: '2020-01-01T00:00:00.000Z' },
]
