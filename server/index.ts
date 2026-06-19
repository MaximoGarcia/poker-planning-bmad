import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { registerSessionHandlers } from './socket/register-session-handlers.js'

const config = loadEnv()
const app = createApp(config)
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: config.allowedOrigins,
    credentials: true,
  },
})

registerSessionHandlers(io)

httpServer.listen(config.port, () => {
  console.info(`ADR Buddy server listening on port ${config.port}`)
})
