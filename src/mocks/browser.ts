import { setupWorker } from 'msw/browser'
import { ws } from 'msw'
import { handlers } from './handlers'
import { attachConnection } from './socket-hub'

const socketLink = ws.link('*')

const socketHandler = socketLink.addEventListener('connection', (connection) => {
  attachConnection(connection)
})

export const worker = setupWorker(...handlers, socketHandler)
