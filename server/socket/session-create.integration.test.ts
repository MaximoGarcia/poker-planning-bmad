// @vitest-environment node
import { createServer, type Server as HttpServer } from 'node:http'
import { AddressInfo } from 'node:net'
import { Server } from 'socket.io'
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client'
import { afterEach, describe, expect, it } from 'vitest'
import { createSessionStore } from '../domain/session-store.js'
import type { SocketRateLimiter } from '../security/rate-limit.js'
import { ERROR_CODES } from '../../src/shared/contracts/errors.js'
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '../../src/shared/contracts/socket-events.js'
import type { CreateSessionCommand } from '../../src/shared/schemas/command-schemas.js'
import { registerSessionHandlers } from './register-session-handlers.js'

interface SocketHarness {
  client: ClientSocket<ServerToClientEvents, ClientToServerEvents>
  httpServer: HttpServer
  io: Server<ClientToServerEvents, ServerToClientEvents>
}

let harnesses: SocketHarness[] = []

afterEach(async () => {
  await Promise.all(harnesses.map((harness) => closeHarness(harness)))
  harnesses = []
})

describe('session:create socket integration', () => {
  it('acknowledges create results and emits a sanitized snapshot', async () => {
    const harness = await createSocketHarness()
    const snapshotPromise = onceSnapshot(harness.client)

    const ack = await emitSessionCreate(harness.client, {
      moderatorName: 'Maxi',
      deckId: 'fibonacci',
    })
    const emittedSnapshot = await snapshotPromise

    expect(ack).toEqual({
      ok: true,
      data: {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        snapshot: emittedSnapshot,
      },
    })
    expect(JSON.stringify(emittedSnapshot)).not.toContain('moderator-token')
    expect(emittedSnapshot).toMatchObject({
      roomCode: 'ABCD12',
      story: null,
      round: {
        active: false,
        revealed: false,
        voteCount: 0,
      },
    })
  })

  it('acknowledges validation failures without snapshot emission', async () => {
    const harness = await createSocketHarness()
    let snapshotEmitted = false
    harness.client.once(SERVER_EVENTS.sessionSnapshot, () => {
      snapshotEmitted = true
    })

    const ack = await emitSessionCreate(harness.client, { moderatorName: '' } as CreateSessionCommand)

    expect(ack).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Session details could not be validated.',
      },
    })
    expect(snapshotEmitted).toBe(false)
  })

  it('acknowledges rate-limit failures without snapshot emission', async () => {
    const harness = await createSocketHarness({
      consume: () => ({ allowed: false, retryAfterMs: 750 }),
    })
    let snapshotEmitted = false
    harness.client.once(SERVER_EVENTS.sessionSnapshot, () => {
      snapshotEmitted = true
    })

    const ack = await emitSessionCreate(harness.client, {
      moderatorName: 'Maxi',
      deckId: 'fibonacci',
    })

    expect(ack).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.rateLimited,
        message: 'Too many session create attempts. Please wait before trying again.',
        details: { retryAfterMs: 750 },
      },
    })
    expect(snapshotEmitted).toBe(false)
  })
})

async function createSocketHarness(rateLimiter?: Partial<SocketRateLimiter>): Promise<SocketHarness> {
  const httpServer = createServer()
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer)
  registerSessionHandlers(io, {
    store: createSessionStore(),
    rateLimiter: rateLimiter
      ? {
          consume: rateLimiter.consume ?? (() => ({ allowed: true })),
          reset: rateLimiter.reset ?? (() => undefined),
          size: rateLimiter.size ?? (() => 0),
        }
      : undefined,
    createSessionDependencies: {
      generateRoomCode: () => 'ABCD12',
      generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      generateParticipantId: () => 'participant-1',
      now: () => new Date('2026-06-28T16:00:00.000Z'),
    },
  })

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', resolve)
  })

  const address = httpServer.address() as AddressInfo
  const client: ClientSocket<ServerToClientEvents, ClientToServerEvents> = createClient(
    `http://127.0.0.1:${address.port}`,
    {
      forceNew: true,
      transports: ['websocket'],
    },
  )

  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve)
    client.once('connect_error', reject)
  })

  const harness = { client, httpServer, io }
  harnesses.push(harness)
  return harness
}

function emitSessionCreate(
  client: ClientSocket<ServerToClientEvents, ClientToServerEvents>,
  command: CreateSessionCommand,
) {
  return new Promise((resolve) => {
    client.emit(CLIENT_EVENTS.sessionCreate, command, resolve)
  })
}

function onceSnapshot(client: ClientSocket<ServerToClientEvents, ClientToServerEvents>) {
  return new Promise((resolve) => {
    client.once(SERVER_EVENTS.sessionSnapshot, resolve)
  })
}

async function closeHarness({ client, httpServer, io }: SocketHarness) {
  client.disconnect()
  await new Promise<void>((resolve) => {
    io.close(() => resolve())
  })
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve())
  })
}
