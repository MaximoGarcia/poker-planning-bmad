import { existsSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { Router } from 'express'
import { createFailureAck } from '../../src/shared/contracts/ack.js'
import { ERROR_CODES } from '../../src/shared/contracts/errors.js'

export function createStaticClientMiddleware(distPath = resolveClientDistPath()) {
  const router = Router()
  const indexPath = join(distPath, 'index.html')

  router.use(express.static(distPath, { index: false }))

  router.get(/^\/(?!api(?:\/|$)|socket\.io(?:\/|$)).*/, (request, response, next) => {
    if (extname(request.path)) {
      next()
      return
    }

    if (!request.accepts('html')) {
      next()
      return
    }

    if (!existsSync(indexPath)) {
      response.status(404).json(
        createFailureAck({
          code: ERROR_CODES.clientBuildNotFound,
          message: 'Client build not found. Run npm run build:client before starting production.',
        }),
      )
      return
    }

    response.sendFile(indexPath)
  })

  return router
}

function resolveClientDistPath() {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(process.cwd(), 'dist'),
    resolve(currentDir, '../../dist'),
    resolve(currentDir, '../../../dist'),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}
