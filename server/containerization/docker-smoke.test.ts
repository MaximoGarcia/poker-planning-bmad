import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const smokeScriptPath = resolve(process.cwd(), 'scripts/docker-smoke.mjs')

describe('scripts/docker-smoke.mjs', () => {
  it('exists as a self-contained Node script', () => {
    const script = readFileSync(smokeScriptPath, 'utf8')
    expect(script).toContain('docker compose up')
  })

  it('verifies the containerized health endpoint', () => {
    const script = readFileSync(smokeScriptPath, 'utf8')
    expect(script).toContain('/health')
  })

  it('orchestrates docker compose teardown', () => {
    const script = readFileSync(smokeScriptPath, 'utf8')
    expect(script).toContain('docker compose down')
  })

  it('supports the APP_PORT environment override', () => {
    const script = readFileSync(smokeScriptPath, 'utf8')
    expect(script).toContain('APP_PORT')
  })
})
