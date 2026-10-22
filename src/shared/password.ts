export function hashPassword(value: string): string {
  let hash = 2166136261
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return `mock-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`
}

export function hashBody(value: unknown): string {
  return hashPassword(stableStringify(value))
}
