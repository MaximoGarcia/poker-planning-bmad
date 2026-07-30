#!/usr/bin/env node
// CI-friendly smoke check for the containerized Poker Planning app.
// Builds and starts the app with `docker compose up`, verifies the health
// endpoint and root path, then tears everything down with `docker compose down`.
//
// Usage:
//   node scripts/docker-smoke.mjs
//   APP_PORT=3001 node scripts/docker-smoke.mjs

import { spawn } from 'node:child_process'

const APP_PORT = Number(process.env.APP_PORT ?? '3000')
const BASE_URL = `http://127.0.0.1:${APP_PORT}`
const COMPOSE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const HEALTH_TIMEOUT = 60 * 1000 // 1 minute
const POLL_INTERVAL = 1000 // 1 second
const FETCH_TIMEOUT = 5000 // 5 seconds

let composeTornDown = false

function log(message) {
  console.log(`[smoke] ${message}`)
}

function runDockerCompose(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['compose', ...args], {
      stdio: 'inherit',
      env: { ...process.env, APP_PORT: String(APP_PORT) },
      ...options,
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve()
      } else {
        reject(new Error(`docker compose ${args.join(' ')} exited with code ${code}`))
      }
    })
  })
}

async function teardown() {
  if (composeTornDown) return
  composeTornDown = true
  log('Tearing down Compose resources...')
  try {
    await runDockerCompose(['down', '--volumes', '--remove-orphans'])
    log('Teardown complete.')
  } catch {
    log('Teardown completed with warnings.')
  }
}

async function waitForHealth() {
  const deadline = Date.now() + HEALTH_TIMEOUT
  const url = new URL('/health', BASE_URL)

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) })
      if (response.ok) {
        const body = await response.json().catch(() => ({}))
        if (body.ok === true && body.data?.status === 'healthy') {
          return body
        }
      }
    } catch (error) {
      log(`Health poll not ready yet: ${error instanceof Error ? error.message : String(error)}`)
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }

  throw new Error(`Health endpoint did not become healthy at ${url} within ${HEALTH_TIMEOUT}ms`)
}

async function assertRootResponds() {
  const response = await fetch(new URL('/', BASE_URL), { signal: AbortSignal.timeout(FETCH_TIMEOUT) })
  if (!response.ok) {
    throw new Error(`Root path returned HTTP ${response.status}`)
  }
  const body = await response.text()
  if (!body.includes('<!doctype html>') && !body.includes('<!DOCTYPE html>')) {
    throw new Error('Root path did not return an HTML document')
  }
}

async function main() {
  log(`Starting containerized smoke check on host port ${APP_PORT}...`)

  process.on('SIGINT', async () => {
    log('Interrupted.')
    await teardown()
    process.exit(130)
  })

  process.on('SIGTERM', async () => {
    log('Terminated.')
    await teardown()
    process.exit(143)
  })

  try {
    log('Building and starting services with docker compose up --build -d --wait...')
    await runDockerCompose(['up', '--build', '-d', '--wait'], { timeout: COMPOSE_TIMEOUT })

    log(`Waiting for /health to report healthy at ${BASE_URL}...`)
    const health = await waitForHealth()
    log(`Health check passed: status=${health.data.status}`)

    log(`Verifying root path at ${BASE_URL}...`)
    await assertRootResponds()
    log('Root path returned a valid HTML document.')

    log('Smoke check completed successfully.')
  } catch (error) {
    log(`Smoke check failed: ${error instanceof Error ? error.message : String(error)}`)
    await teardown()
    process.exit(1)
  }

  await teardown()
}

main()
