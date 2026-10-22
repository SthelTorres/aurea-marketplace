import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { useSession } from '@/hooks/use-session'
import { closeSocket, openSocket } from '@/lib/socket-manager'
import type { Socket } from 'socket.io-client'
import { router } from '@/router'

function SessionSocket() {
  const { data, isFetched } = useSession()
  const userId = data?.user.id ?? null
  useEffect(() => {
    if (!isFetched) return undefined
    let disposed = false
    let socket: Socket | undefined
    void openSocket(userId).then((created) => {
      if (disposed) {
        closeSocket(created)
        return
      }
      socket = created
    })
    return () => {
      disposed = true
      if (socket) closeSocket(socket)
    }
  }, [isFetched, userId])
  return null
}

export default function Root() {
  return (
    <>
      <SessionSocket />
      <RouterProvider router={router} />
    </>
  )
}
