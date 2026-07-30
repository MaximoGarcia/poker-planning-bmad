// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import request from 'supertest'
import { createStaticClientMiddleware } from './static-client'

describe('static client middleware', () => {
  let distPath: string

  beforeEach(() => {
    distPath = mkdtempSync(join(tmpdir(), 'poker-planning-bmad-dist-'))
    mkdirSync(join(distPath, 'assets'))
    writeFileSync(join(distPath, 'index.html'), '<!doctype html><div id="root"></div>')
  })

  afterEach(() => {
    rmSync(distPath, { recursive: true, force: true })
  })

  it('serves the SPA fallback for browser routes', async () => {
    const app = createTestApp(distPath)

    await request(app)
      .get('/session/ABC123')
      .set('Accept', 'text/html')
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('id="root"')
      })
  })

  it('does not serve the SPA fallback for missing asset paths', async () => {
    const app = createTestApp(distPath)

    await request(app).get('/assets/missing.js').set('Accept', '*/*').expect(404)
  })
})

function createTestApp(distPath: string) {
  const app = express()
  app.use(createStaticClientMiddleware(distPath))
  app.use((_request, response) => {
    response.sendStatus(404)
  })
  return app
}
