import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const composePath = resolve(__dirname, '../../compose.yaml')

function readCompose(): Record<string, unknown> {
  return parse(readFileSync(composePath, 'utf8')) as Record<string, unknown>
}

describe('compose.yaml', () => {
  it('defines a single app service built from the root Dockerfile', () => {
    const doc = readCompose()
    const services = doc.services as Record<string, unknown>

    expect(Object.keys(services)).toEqual(['app'])

    const app = services.app as Record<string, unknown>
    const build = app.build as Record<string, unknown>
    expect(build.context).toBe('.')
    expect(build.dockerfile).toBe('Dockerfile')
  })

  it('publishes the standard application port', () => {
    const doc = readCompose()
    const app = (doc.services as Record<string, unknown>).app as Record<string, unknown>
    const ports = app.ports as string[]

    expect(ports).toEqual(expect.arrayContaining([expect.stringContaining('3000')]))
  })

  it('configures production runtime environment for the mapped port', () => {
    const doc = readCompose()
    const app = (doc.services as Record<string, unknown>).app as Record<string, unknown>
    const env = app.environment as Record<string, string>

    expect(env.NODE_ENV).toBe('production')
    expect(env.PORT).toBe('3000')
    expect(env.ALLOWED_ORIGINS).toBe('http://localhost:3000,http://127.0.0.1:3000')
  })

  it('declares a healthcheck against the in-container health endpoint', () => {
    const doc = readCompose()
    const app = (doc.services as Record<string, unknown>).app as Record<string, unknown>
    const healthcheck = app.healthcheck as Record<string, unknown>

    expect(healthcheck).toBeDefined()
    const test = healthcheck.test as string[]
    expect(test.join(' ')).toContain('/health')
  })

  it('does not introduce non-MVP runtime services or replicas', () => {
    const doc = readCompose()
    const serviceNames = Object.keys(doc.services as Record<string, unknown>)

    expect(serviceNames).toEqual(['app'])

    const app = (doc.services as Record<string, unknown>).app as Record<string, unknown>
    expect(app).not.toHaveProperty('deploy')
  })
})
