import { useSyncExternalStore } from 'react'

let liveMessage = ''
let bannerMessage = ''
const liveListeners = new Set<() => void>()
const bannerListeners = new Set<() => void>()

function emitLive(): void {
  liveListeners.forEach((listener) => listener())
}

function emitBanner(): void {
  bannerListeners.forEach((listener) => listener())
}

export function announce(message: string): void {
  liveMessage = ''
  emitLive()
  queueMicrotask(() => {
    liveMessage = message
    emitLive()
  })
}

export function setRealtimeBanner(message: string): void {
  bannerMessage = message
  emitBanner()
}

export function clearRealtimeBanner(): void {
  bannerMessage = ''
  emitBanner()
}

export function useLiveMessage(): string {
  return useSyncExternalStore(
    (listener) => {
      liveListeners.add(listener)
      return () => liveListeners.delete(listener)
    },
    () => liveMessage,
    () => '',
  )
}

export function useRealtimeBanner(): string {
  return useSyncExternalStore(
    (listener) => {
      bannerListeners.add(listener)
      return () => bannerListeners.delete(listener)
    },
    () => bannerMessage,
    () => '',
  )
}
