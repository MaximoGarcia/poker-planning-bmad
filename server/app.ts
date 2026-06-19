import cors, { type CorsOptions } from 'cors'
import express from 'express'
import helmet from 'helmet'
import { loadEnv, type ServerConfig } from './config/env.js'
import { healthRouter } from './http/health.js'
import { createStaticClientMiddleware } from './http/static-client.js'

export function createApp(config: ServerConfig = loadEnv()) {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(
    cors({
      origin: createCorsOrigin(config.allowedOrigins),
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '100kb' }))
  app.use('/health', healthRouter)
  app.use(createStaticClientMiddleware())

  return app
}

function createCorsOrigin(allowedOrigins: readonly string[]): CorsOptions['origin'] {
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Origin not allowed by CORS'))
  }
}
