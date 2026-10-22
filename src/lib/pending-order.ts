const STORAGE_KEY = 'aurea-pending-orders'

function readMap(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

export function pendingOrderId(userId: string): string | null {
  return readMap()[userId] ?? null
}

export function rememberPendingOrder(userId: string, orderId: string): void {
  const map = readMap()
  map[userId] = orderId
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  window.dispatchEvent(new Event('aurea-pending-order'))
}

export function forgetPendingOrder(userId: string): void {
  const map = readMap()
  delete map[userId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  window.dispatchEvent(new Event('aurea-pending-order'))
}
