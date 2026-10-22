/** Aceita apenas caminho interno. Rejeita URL absoluta e protocol-relative (`//`). */
export function safeInternalPath(value: string | null | undefined): string {
  if (!value) return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  if (value.includes('://') || value.includes('\\')) return '/'
  return value
}
