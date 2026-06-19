// @vitest-environment node
import { loadEnv } from './env'

describe('loadEnv', () => {
  it('uses local origins outside production when no origins are configured', () => {
    const config = loadEnv({} as NodeJS.ProcessEnv)

    expect(config).toMatchObject({
      port: 3000,
      nodeEnv: 'development',
      allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    })
  })

  it('requires explicit allowed origins in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(
      'ALLOWED_ORIGINS must be set in production',
    )
  })

  it('uses configured production origins when provided', () => {
    const config = loadEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      ALLOWED_ORIGINS: 'https://adr-buddy.example.com, https://admin.example.com',
    } as NodeJS.ProcessEnv)

    expect(config).toEqual({
      port: 8080,
      nodeEnv: 'production',
      allowedOrigins: ['https://adr-buddy.example.com', 'https://admin.example.com'],
    })
  })
})
