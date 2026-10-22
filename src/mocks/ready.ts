let pending: Promise<void> = Promise.resolve()

export function setMocksReady(promise: Promise<void>): void {
  pending = promise.catch(() => undefined)
}

export function waitForMocks(): Promise<void> {
  return pending
}
