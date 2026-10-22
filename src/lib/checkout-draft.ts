import type { Network } from '@/shared/types'

const STORAGE_KEY = 'aurea-checkout-draft'

export interface CheckoutDraft {
  name: string
  email: string
  walletId: string
  network: Network
  acceptTerms: boolean
}

export function readCheckoutDraft(): Partial<CheckoutDraft> | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    return JSON.parse(raw) as Partial<CheckoutDraft>
  } catch {
    return undefined
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export function clearCheckoutDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
