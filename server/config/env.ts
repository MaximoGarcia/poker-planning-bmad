export interface ServerConfig {
  port: number
  allowedOrigins: string[]
  nodeEnv: string
}

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

export function loadEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const nodeEnv = env.NODE_ENV ?? 'development'

  return {
    port: parsePort(env.PORT),
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS, nodeEnv),
    nodeEnv,
  }
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3000
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

function parseAllowedOrigins(value: string | undefined, nodeEnv: string): string[] {
  const configuredOrigins =
    value
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []

  if (configuredOrigins.length > 0) {
    return configuredOrigins
  }

  if (nodeEnv === 'production') {
    throw new Error('ALLOWED_ORIGINS must be set in production')
  }

  return LOCAL_ORIGINS
}
