export function describedBy(id: string, error?: string): string | undefined {
  return error ? `${id}-error` : undefined
}
