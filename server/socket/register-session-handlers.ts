import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../src/shared/contracts/socket-events.js'

type SessionSocket = Socket<ClientToServerEvents, ServerToClientEvents>
type SessionServer = Server<ClientToServerEvents, ServerToClientEvents>

export function registerSessionHandlers(io: SessionServer) {
  io.on('connection', (socket: SessionSocket) => {
    socket.data.connectedAt = new Date().toISOString()
  })
}
