import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Dockerfile', () => {
  const dockerfilePath = resolve(process.cwd(), 'Dockerfile')

  it('uses a multi-stage production-oriented Node build', () => {
    const dockerfile = readFileSync(dockerfilePath, 'utf8')

    expect(dockerfile).toContain('FROM node:20-alpine AS build')
    expect(dockerfile).toContain('RUN npm ci')
    expect(dockerfile).toContain('RUN npm run build')
    expect(dockerfile).toContain('FROM node:20-alpine AS runtime')
  })

  it('copies only runtime artifacts into the final image', () => {
    const dockerfile = readFileSync(dockerfilePath, 'utf8')

    expect(dockerfile).toContain('COPY --from=build /app/server-dist ./server-dist')
    expect(dockerfile).toContain('COPY --from=build /app/dist ./dist')
    expect(dockerfile).toContain('CMD ["node", "server-dist/server/index.js"]')
  })

  it('exposes and uses the application port', () => {
    const dockerfile = readFileSync(dockerfilePath, 'utf8')

    expect(dockerfile).toContain('ENV PORT=3000')
    expect(dockerfile).toContain('ENV ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000')
    expect(dockerfile).toContain('EXPOSE 3000')
  })
})

describe('.dockerignore', () => {
  const dockerignorePath = resolve(process.cwd(), '.dockerignore')

  it('excludes local artifacts and caches from build context', () => {
    const dockerignore = readFileSync(dockerignorePath, 'utf8')

    expect(dockerignore).toContain('node_modules')
    expect(dockerignore).toContain('dist')
    expect(dockerignore).toContain('server-dist')
    expect(dockerignore).toContain('.git')
    expect(dockerignore).toContain('coverage')
    expect(dockerignore).toContain('_bmad-output')
  })
})
