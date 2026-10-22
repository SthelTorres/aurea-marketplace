import { useSyncExternalStore } from 'react'
import { getSocketStatus, subscribeSocketStatus, type SocketStatus } from '@/lib/socket-manager'

export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(subscribeSocketStatus, getSocketStatus, () => 'connecting')
}
