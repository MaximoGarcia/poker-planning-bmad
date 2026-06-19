// @vitest-environment node
import request from 'supertest'
import { createApp } from '../app'

describe('health endpoint', () => {
  it('returns a successful health response', async () => {
    const app = createApp({
      port: 0,
      allowedOrigins: ['http://localhost:5173'],
      nodeEnv: 'test',
    })

    await request(app)
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          ok: true,
          data: {
            service: 'adr-buddy',
            status: 'healthy',
          },
        })
      })
  })

  it('sets default browser security headers', async () => {
    const app = createApp({
      port: 0,
      allowedOrigins: ['http://localhost:5173'],
      nodeEnv: 'test',
    })

    await request(app)
      .get('/health')
      .expect(200)
      .expect(({ headers }) => {
        expect(headers['content-security-policy']).toContain("default-src 'self'")
      })
  })
})
