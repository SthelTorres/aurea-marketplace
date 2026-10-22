import { hashBody } from '@/shared/password'

const STORAGE_KEY = 'aurea-order-attempt'

interface Attempt {
  key: string
  hash: string
}

export function idempotencyKeyFor(body: unknown): string {
  const hash = hashBody(body)
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const saved = JSON.parse(raw) as Attempt
      if (saved.hash === hash && saved.key) return saved.key
    } catch {
      /* gera uma chave nova */
    }
  }
  const key = crypto.randomUUID()
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ key, hash } satisfies Attempt))
  return key
}

export function clearIdempotencyKey(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
