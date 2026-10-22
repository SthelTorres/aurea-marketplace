const NATIVE_KEY = '__AUREA_NATIVE_WEB_SOCKET'

type NativeWindow = Window & { [NATIVE_KEY]?: typeof WebSocket }

let relay: WebSocket | null = null
const pending: string[] = []

function nativeSocket(): typeof WebSocket | undefined {
  return (window as NativeWindow)[NATIVE_KEY]
}

function openRelay(): WebSocket | null {
  const Native = nativeSocket()
  if (!Native) return null
  if (relay && relay.readyState !== WebSocket.CLOSED) return relay
  const url = `${window.location.origin.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`
  relay = new Native(url)
  relay.addEventListener('open', flush)
  relay.addEventListener('error', () => {
    relay = null
  })
  return relay
}

function flush(): void {
  if (!relay || relay.readyState !== WebSocket.OPEN) return
  while (pending.length > 0) {
    const next = pending.shift()
    if (next) relay.send(next)
  }
}

function mirror(data: string): void {
  const socket = openRelay()
  if (!socket) return
  pending.push(data)
  flush()
}

export function rememberNativeWebSocket(): void {
  const target = window as NativeWindow
  target[NATIVE_KEY] ??= window.WebSocket
}

export function mirrorClient(client: { send: (data: string | Blob | ArrayBufferLike) => void }): void {
  const original = client.send.bind(client)
  client.send = (data) => {
    original(data)
    if (typeof data === 'string') mirror(data)
  }
}
