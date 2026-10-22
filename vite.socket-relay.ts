import { createHash } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Plugin } from 'vite'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

function readFrame(buffer: Buffer): { opcode: number; payload: Buffer; bytes: number } | null {
  if (buffer.length < 2) return null
  const opcode = buffer[0] & 0x0f
  const masked = (buffer[1] & 0x80) !== 0
  let length = buffer[1] & 0x7f
  let offset = 2
  if (length === 126) {
    if (buffer.length < 4) return null
    length = buffer.readUInt16BE(2)
    offset = 4
  } else if (length === 127) {
    if (buffer.length < 10) return null
    length = Number(buffer.readBigUInt64BE(2))
    offset = 10
  }
  const maskLength = masked ? 4 : 0
  if (buffer.length < offset + maskLength + length) return null
  const payload = Buffer.from(buffer.subarray(offset + maskLength, offset + maskLength + length))
  if (masked) {
    const mask = buffer.subarray(offset, offset + 4)
    for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4]
  }
  return { opcode, payload, bytes: offset + maskLength + length }
}

function encodeFrame(payload: Buffer, opcode: number): Buffer {
  const length = payload.length
  let header: Buffer
  if (length < 126) header = Buffer.from([0x80 | opcode, length])
  else if (length < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x80 | opcode
    header[1] = 126
    header.writeUInt16BE(length, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x80 | opcode
    header[1] = 127
    header.writeBigUInt64BE(BigInt(length), 2)
  }
  return Buffer.concat([header, payload])
}

function acceptUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
  const key = request.headers['sec-websocket-key']
  if (!key || Array.isArray(key)) {
    socket.destroy()
    return
  }
  const accept = createHash('sha1').update(key + GUID).digest('base64')
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '
    + accept
    + '\r\n\r\n',
  )
  let buffer = Buffer.from(head)
  socket.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk])
    while (buffer.length > 0) {
      const frame = readFrame(buffer)
      if (!frame) break
      buffer = buffer.subarray(frame.bytes)
      if (frame.opcode === 0x8) {
        socket.write(encodeFrame(Buffer.alloc(0), 0x8))
        socket.end()
        return
      }
      if (frame.opcode === 0x9) {
        socket.write(encodeFrame(frame.payload, 0xa))
        continue
      }
      if (frame.opcode === 0x1 || frame.opcode === 0x2) socket.write(encodeFrame(frame.payload, frame.opcode))
    }
  })
  socket.on('error', () => {
    socket.destroy()
  })
}

function attach(httpServer: { prependListener?: Function; on?: Function; __aureaRelay?: boolean } | null): void {
  if (!httpServer || httpServer.__aureaRelay) return
  httpServer.__aureaRelay = true
  const listen = httpServer.prependListener?.bind(httpServer) ?? httpServer.on?.bind(httpServer)
  listen?.('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const path = request.url?.split('?')[0] ?? ''
    if (path !== '/socket.io' && path !== '/socket.io/') return
    acceptUpgrade(request, socket, head)
  })
}

export function socketRelayPlugin(): Plugin {
  return {
    name: 'aurea-socket-relay',
    configureServer(server) {
      attach(server.httpServer)
    },
    configurePreviewServer(server) {
      attach(server.httpServer)
    },
  }
}
