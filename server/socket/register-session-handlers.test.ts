import { describe, expect, it, vi } from 'vitest'
import { createSessionStore } from '../domain/session-store.js'
import type { CreateSessionDependencies } from '../domain/session-commands.js'
import type { SocketRateLimiter } from '../security/rate-limit.js'
import { ERROR_CODES } from '../../src/shared/contracts/errors.js'
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../src/shared/contracts/socket-events.js'
import { registerSessionHandlers } from './register-session-handlers.js'

type EventHandler = (...args: unknown[]) => void

function createHarness(
  rateLimiter?: Partial<SocketRateLimiter>,
  createSessionDependencies?: Partial<Omit<CreateSessionDependencies, 'store'>>,
) {
  let connectionHandler: EventHandler | undefined
  const io = {
    on: vi.fn((eventName: string, handler: EventHandler) => {
      if (eventName === 'connection') {
        connectionHandler = handler
      }
    }),
  }
  const socketHandlers = new Map<string, EventHandler>()
  const socket = {
    id: 'socket-1',
    data: {},
    on: vi.fn((eventName: string, handler: EventHandler) => {
      socketHandlers.set(eventName, handler)
    }),
    join: vi.fn(),
    emit: vi.fn(),
  }

  registerSessionHandlers(io as never, {
    store: createSessionStore(),
    rateLimiter: {
      consume: rateLimiter?.consume ?? (() => ({ allowed: true })),
      reset: rateLimiter?.reset ?? vi.fn(),
      size: rateLimiter?.size ?? (() => 0),
    },
    createSessionDependencies: {
      generateRoomCode: () => 'ABCD12',
      generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      generateParticipantId: () => 'participant-1',
      now: () => new Date('2026-06-28T16:00:00.000Z'),
      ...createSessionDependencies,
    },
  })
  connectionHandler?.(socket)

  return {
    socket,
    disconnectHandler: socketHandlers.get('disconnect'),
    sessionCreateHandler: socketHandlers.get(CLIENT_EVENTS.sessionCreate),
  }
}

describe('registerSessionHandlers', () => {
  it('creates a session, joins the room, acknowledges, and emits a sanitized snapshot', () => {
    const { socket, sessionCreateHandler } = createHarness()
    const ack = vi.fn()

    sessionCreateHandler?.({ moderatorName: 'Maxi' }, ack)

    expect(socket.join).toHaveBeenCalledWith('ABCD12')
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        snapshot: expect.objectContaining({
          roomCode: 'ABCD12',
          story: null,
          round: { active: false, revealed: false, voteCount: 0 },
        }),
      },
    })
    expect(socket.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.not.objectContaining({ moderatorToken: expect.any(String) }),
    )
    expect(socket.data).toEqual({
      connectedAt: '2026-06-28T16:00:00.000Z',
      identity: {
        roomCode: 'ABCD12',
        participantId: 'participant-1',
        role: 'moderator',
      },
    })
    expect(JSON.stringify(socket.emit.mock.calls)).not.toContain('moderator-token')
  })

  it('returns a validation failure without joining or emitting', () => {
    const { socket, sessionCreateHandler } = createHarness()
    const ack = vi.fn()

    sessionCreateHandler?.({ moderatorName: '' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Session details could not be validated.',
      },
    })
    expect(socket.join).not.toHaveBeenCalled()
    expect(socket.emit).not.toHaveBeenCalledWith(SERVER_EVENTS.sessionSnapshot, expect.anything())
  })

  it('applies rate limiting before validation', () => {
    const consume = vi.fn(() => ({ allowed: false as const, retryAfterMs: 750 }))
    const { socket, sessionCreateHandler } = createHarness({ consume })
    const ack = vi.fn()

    sessionCreateHandler?.({ moderatorName: '' }, ack)

    expect(consume).toHaveBeenCalledWith('socket-1')
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.rateLimited,
        message: 'Too many session create attempts. Please wait before trying again.',
        details: { retryAfterMs: 750 },
      },
    })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('returns a rate-limit failure without creating local socket state', () => {
    const { socket, sessionCreateHandler } = createHarness({
      consume: () => ({ allowed: false, retryAfterMs: 750 }),
    })
    const ack = vi.fn()

    sessionCreateHandler?.({ moderatorName: 'Maxi' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.rateLimited,
        message: 'Too many session create attempts. Please wait before trying again.',
        details: { retryAfterMs: 750 },
      },
    })
    expect(socket.join).not.toHaveBeenCalled()
    expect(socket.data).toEqual({ connectedAt: '2026-06-28T16:00:00.000Z' })
  })

  it('does not create a session when acknowledgement callback is missing', () => {
    const consume = vi.fn(() => ({ allowed: true as const }))
    const { socket, sessionCreateHandler } = createHarness({ consume })

    sessionCreateHandler?.({ moderatorName: 'Maxi' })

    expect(consume).not.toHaveBeenCalled()
    expect(socket.join).not.toHaveBeenCalled()
    expect(socket.emit).not.toHaveBeenCalledWith(SERVER_EVENTS.sessionSnapshot, expect.anything())
  })

  it('does not create a session when acknowledgement callback is not callable', () => {
    const consume = vi.fn(() => ({ allowed: true as const }))
    const { socket, sessionCreateHandler } = createHarness({ consume })

    sessionCreateHandler?.({ moderatorName: 'Maxi' }, 'not-an-ack')

    expect(consume).not.toHaveBeenCalled()
    expect(socket.join).not.toHaveBeenCalled()
    expect(socket.emit).not.toHaveBeenCalledWith(SERVER_EVENTS.sessionSnapshot, expect.anything())
  })

  it('converts create-session exceptions into stable failure acknowledgements', () => {
    const { socket, sessionCreateHandler } = createHarness(
      {
        consume: () => ({ allowed: true }),
      },
      {
        generateRoomCode: () => {
          throw new Error('room code generator failed')
        },
      },
    )
    const ack = vi.fn()

    sessionCreateHandler?.({ moderatorName: 'Maxi' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.sessionCreateFailed,
        message: 'Session could not be created. Please try again.',
      },
    })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('converts room join failures into stable failure acknowledgements', () => {
    const { socket, sessionCreateHandler } = createHarness()
    const ack = vi.fn()
    socket.join.mockImplementation(() => {
      throw new Error('join failed')
    })

    sessionCreateHandler?.({ moderatorName: 'Maxi' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.sessionCreateFailed,
        message: 'Session could not be created. Please try again.',
      },
    })
    expect(socket.emit).not.toHaveBeenCalledWith(SERVER_EVENTS.sessionSnapshot, expect.anything())
    expect(socket.data).toEqual({ connectedAt: '2026-06-28T16:00:00.000Z' })
  })

  it('clears rate-limit state when the socket disconnects', () => {
    const reset = vi.fn()
    const { disconnectHandler } = createHarness({
      consume: () => ({ allowed: true }),
      reset,
    })

    disconnectHandler?.()

    expect(reset).toHaveBeenCalledWith('socket-1')
  })
})
