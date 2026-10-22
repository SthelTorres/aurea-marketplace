import { mocksEnabled } from '@/mocks/enable'

export function devPanelVisible(): boolean {
  if (!mocksEnabled) return false
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('dev')
}
