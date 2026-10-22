import { SCENARIO_KEY } from '@/mocks/keys'
import { rememberNativeWebSocket } from '@/mocks/socket-relay'
import { SCENARIOS, type Scenario } from '@/shared/types'

export const mocksEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'true'

function applyScenarioFromLocation(): void {
  const scenario = new URLSearchParams(window.location.search).get('scenario')
  if (scenario && SCENARIOS.includes(scenario as Scenario)) {
    localStorage.setItem(SCENARIO_KEY, scenario)
  }
}

export async function enableMocking(): Promise<void> {
  let state = 'ready'
  try {
    if (typeof window === 'undefined' || !mocksEnabled) return
    rememberNativeWebSocket()
    applyScenarioFromLocation()
    const { worker } = await import('./browser')
    await worker.start({
      serviceWorker: { url: '/mockServiceWorker.js' },
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
  } catch (error) {
    state = error instanceof Error ? error.message : 'error'
    throw error
  } finally {
    if (typeof document !== 'undefined') document.documentElement.dataset.mocks = state
  }
}
