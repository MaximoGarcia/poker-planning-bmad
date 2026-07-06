import { describe, expect, it, vi } from 'vitest'
import { createSessionStore } from '../domain/session-store.js'
import type { CreateSessionDependencies, JoinSessionDependencies } from '../domain/session-commands.js'
import type { SocketRateLimiter } from '../security/rate-limit.js'
import { ERROR_CODES } from '../../src/shared/contracts/errors.js'
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../src/shared/contracts/socket-events.js'
import { registerSessionHandlers } from './register-session-handlers.js'

type EventHandler = (...args: unknown[]) => void

function createHarness(
  rateLimiter?: Partial<SocketRateLimiter>,
  createSessionDependencies?: Partial<Omit<CreateSessionDependencies, 'store'>>,
  joinSessionDependencies?: Partial<Omit<JoinSessionDependencies, 'store'>>,
  moderatorSessionDependencies?: { now?: () => Date },
) {
  const store = createSessionStore()
  let connectionHandler: EventHandler | undefined
  const roomEmitter = {
    emit: vi.fn(),
  }
  const io = {
    on: vi.fn((eventName: string, handler: EventHandler) => {
      if (eventName === 'connection') {
        connectionHandler = handler
      }
    }),
    to: vi.fn(() => roomEmitter),
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
    store,
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
    joinSessionDependencies: {
      generateParticipantId: () => 'participant-2',
      generateParticipantToken: () => 'participant-token-abcdefghijklmnopqrstuvwxyz',
      now: () => new Date('2026-07-02T12:00:00.000Z'),
      ...joinSessionDependencies,
    },
    moderatorSessionDependencies,
  })
  connectionHandler?.(socket)

  return {
    socket,
    io,
    roomEmitter,
    store,
    disconnectHandler: socketHandlers.get('disconnect'),
    sessionCreateHandler: socketHandlers.get(CLIENT_EVENTS.sessionCreate),
    sessionJoinHandler: socketHandlers.get(CLIENT_EVENTS.sessionJoin),
    storyUpdateHandler: socketHandlers.get(CLIENT_EVENTS.storyUpdate),
    deckSelectHandler: socketHandlers.get(CLIENT_EVENTS.deckSelect),
    roundStartHandler: socketHandlers.get(CLIENT_EVENTS.roundStart),
    roundRevealHandler: socketHandlers.get(CLIENT_EVENTS.roundReveal),
    voteSubmitHandler: socketHandlers.get(CLIENT_EVENTS.voteSubmit),
    estimateRecordHandler: socketHandlers.get(CLIENT_EVENTS.estimateRecord),
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

  it('joins a participant, acknowledges with a token, and emits a token-free room snapshot', () => {
    const { socket, io, roomEmitter, sessionCreateHandler, sessionJoinHandler } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    socket.join.mockClear()
    socket.emit.mockClear()
    const ack = vi.fn()

    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Ana' }, ack)

    expect(socket.join).toHaveBeenCalledWith('ABCD12')
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: {
        roomCode: 'ABCD12',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        participantId: 'participant-2',
        displayName: 'Ana',
        snapshot: expect.objectContaining({
          roomCode: 'ABCD12',
          participants: expect.arrayContaining([
            {
              id: 'participant-2',
              displayName: 'Ana',
              role: 'participant',
              connected: true,
              hasVoted: false,
            },
          ]),
        }),
      },
    })
    expect(socket.data.identity).toEqual({
      roomCode: 'ABCD12',
      participantId: 'participant-2',
      role: 'participant',
    })
    expect(io.to).toHaveBeenCalledWith('ABCD12')
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.not.objectContaining({ participantToken: expect.any(String) }),
    )
    expect(JSON.stringify(roomEmitter.emit.mock.calls)).not.toContain('participant-token')
  })

  it('allowlists join acknowledgements and room snapshots from stored session state', () => {
    const { socket, roomEmitter, store, sessionCreateHandler, sessionJoinHandler } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      snapshot: {
        ...session.snapshot,
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        votes: { 'participant-2': '8' },
        groupedResults: [{ value: '8', count: 1 }],
        estimatedStories: [{ id: 'ADR-20', estimate: '8' }],
        participants: session.snapshot.participants.map((participant) => ({
          ...participant,
          selectedCard: '13',
          token: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        })),
        round: {
          ...session.snapshot.round,
          distribution: { '13': 1 },
        },
      },
    } as never)
    socket.join.mockClear()
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Ana' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({
        snapshot: expect.not.objectContaining({
          moderatorToken: expect.any(String),
          participantToken: expect.any(String),
          votes: expect.anything(),
          groupedResults: expect.anything(),
          estimatedStories: expect.anything(),
        }),
      }),
    })
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.not.objectContaining({
        moderatorToken: expect.any(String),
        participantToken: expect.any(String),
        votes: expect.anything(),
        groupedResults: expect.anything(),
        estimatedStories: expect.anything(),
      }),
    )
    const emittedSnapshot = roomEmitter.emit.mock.calls.at(-1)?.[1] as Record<string, unknown>
    const ackSnapshot = (ack.mock.calls.at(-1)?.[0] as { data: { snapshot: Record<string, unknown> } })
      .data.snapshot

    expect(ackSnapshot.participants).toEqual([
      {
        id: 'participant-1',
        displayName: 'Maxi',
        role: 'moderator',
        connected: true,
        hasVoted: false,
      },
      {
        id: 'participant-2',
        displayName: 'Ana',
        role: 'participant',
        connected: true,
        hasVoted: false,
      },
    ])
    expect(emittedSnapshot.round).toEqual({ active: false, revealed: false, voteCount: 0 })
    expect(JSON.stringify(ack.mock.calls)).not.toContain('selectedCard')
    expect(JSON.stringify(roomEmitter.emit.mock.calls)).not.toContain('moderator-token')
    expect(JSON.stringify(roomEmitter.emit.mock.calls)).not.toContain('participant-token')
  })

  it('returns validation failure for malformed join payloads before mutating state', () => {
    const { socket, sessionJoinHandler } = createHarness()
    const ack = vi.fn()

    sessionJoinHandler?.({ roomCode: '', displayName: '' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Session join details could not be validated.',
      },
    })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('returns invalid room code when joining an inactive room', () => {
    const { socket, sessionJoinHandler } = createHarness()
    const ack = vi.fn()

    sessionJoinHandler?.({ roomCode: 'NOPE1', displayName: 'Ana' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.invalidRoomCode,
        message: 'Room code is invalid or inactive.',
      },
    })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('disambiguates duplicate display names through the join socket command', () => {
    const { sessionCreateHandler, sessionJoinHandler } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    const ack = vi.fn()

    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Maxi' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({
        displayName: 'Maxi (2)',
        snapshot: expect.objectContaining({
          participants: expect.arrayContaining([
            {
              id: 'participant-2',
              displayName: 'Maxi (2)',
              role: 'participant',
              connected: true,
              hasVoted: false,
            },
          ]),
        }),
      }),
    })
  })

  it('converts join-session exceptions into stable failure acknowledgements', () => {
    const { sessionCreateHandler, sessionJoinHandler } = createHarness(undefined, undefined, {
      generateParticipantToken: () => {
        throw new Error('token generator failed')
      },
    })
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    const ack = vi.fn()

    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Ana' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.sessionJoinFailed,
        message: 'Session could not be joined. Please try again.',
      },
    })
  })

  it('rolls back participant state when joining the socket room fails', () => {
    const { socket, store, sessionCreateHandler, sessionJoinHandler } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    socket.join.mockClear()
    socket.join.mockImplementation(() => {
      throw new Error('join failed')
    })
    const ack = vi.fn()

    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Ana' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.sessionJoinFailed,
        message: 'Session could not be joined. Please try again.',
      },
    })
    expect(store.get('ABCD12')?.snapshot.participants).toEqual([
      {
        id: 'participant-1',
        displayName: 'Maxi',
        role: 'moderator',
        connected: true,
        hasVoted: false,
      },
    ])
    expect(store.get('ABCD12')?.participantTokens.size).toBe(0)
  })

  it('applies rate limiting before join validation', () => {
    const consume = vi.fn(() => ({ allowed: false as const, retryAfterMs: 750 }))
    const { socket, sessionJoinHandler } = createHarness({ consume })
    const ack = vi.fn()

    sessionJoinHandler?.({ roomCode: '', displayName: '' }, ack)

    expect(consume).toHaveBeenCalledWith('socket-1')
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.rateLimited,
        message: 'Too many session join attempts. Please wait before trying again.',
        details: { retryAfterMs: 750 },
      },
    })
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('does not mutate join state without a callable acknowledgement', () => {
    const consume = vi.fn(() => ({ allowed: true as const }))
    const { socket, sessionJoinHandler } = createHarness({ consume })

    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Ana' }, 'not-an-ack')

    expect(consume).not.toHaveBeenCalled()
    expect(socket.join).not.toHaveBeenCalled()
  })

  it('broadcasts a sanitized snapshot after a valid moderator story update', () => {
    const { roomEmitter, sessionCreateHandler, storyUpdateHandler } = createHarness(
      undefined,
      undefined,
      undefined,
    )
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    const ack = vi.fn()

    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: false,
        },
      }),
    })
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.not.objectContaining({ moderatorToken: expect.any(String) }),
    )
  })

  it('returns unauthorized when a participant token is used for a moderator story update', () => {
    const { roomEmitter, sessionCreateHandler, storyUpdateHandler } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    const ack = vi.fn()

    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can update the current story or deck.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns stable validation failures for malformed deck selection payloads', () => {
    const { roomEmitter, deckSelectHandler } = createHarness()
    const ack = vi.fn()

    deckSelectHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'short',
        deckId: 'nope',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Deck selection details could not be validated.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns STORY_LOCKED without broadcasting when the moderator changes deck mid-round', () => {
    const { roomEmitter, store, sessionCreateHandler, storyUpdateHandler, deckSelectHandler } =
      createHarness(
        undefined,
        undefined,
        undefined,
      )
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )

    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      snapshot: {
        ...session.snapshot,
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: true,
        },
      },
    })
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    deckSelectHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        deckId: 'tshirt',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.storyLocked,
        message: 'The current story and deck cannot change during an active round.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
    expect(store.get('ABCD12')?.snapshot.deck.id).toBe('fibonacci')
  })

  it('returns a stable failure when a moderator command throws before acknowledgement', () => {
    const { roomEmitter, sessionCreateHandler, storyUpdateHandler } = createHarness(
      undefined,
      undefined,
      undefined,
      {
        now: () => {
          throw new Error('clock failed')
        },
      },
    )
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    const ack = vi.fn()

    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.connectionUnavailable,
        message: 'Moderator command could not be completed. Please try again.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns a stable failure when broadcasting a moderator update throws', () => {
    const { roomEmitter, sessionCreateHandler, storyUpdateHandler } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    roomEmitter.emit.mockImplementation(() => {
      throw new Error('broadcast failed')
    })
    const ack = vi.fn()

    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.connectionUnavailable,
        message: 'Moderator command could not be completed. Please try again.',
      },
    })
  })

  it('acknowledges and broadcasts a room snapshot after a valid round start command', () => {
    const { roomEmitter, sessionCreateHandler, storyUpdateHandler, roundStartHandler } = createHarness(
      undefined,
      undefined,
      undefined,
      {
        now: () => new Date('2026-07-02T12:10:00.000Z'),
      },
    )
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: true,
        },
        round: {
          active: true,
          revealed: false,
          voteCount: 0,
        },
      }),
    })
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.objectContaining({
        roomCode: 'ABCD12',
        round: {
          active: true,
          revealed: false,
          voteCount: 0,
        },
      }),
    )
    expect(ack.mock.invocationCallOrder[0]).toBeLessThan(
      roomEmitter.emit.mock.invocationCallOrder[0],
    )
  })

  it('records a final estimate with a moderator-safe ack and participant-safe room snapshot', () => {
    const {
      roomEmitter,
      sessionCreateHandler,
      storyUpdateHandler,
      roundStartHandler,
      roundRevealHandler,
      estimateRecordHandler,
    } = createHarness(undefined, undefined, undefined, {
      now: () => new Date('2026-07-04T10:00:00.000Z'),
    })
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )
    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      vi.fn(),
    )
    roundRevealHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    estimateRecordHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({
        estimatedStories: [
          {
            storyId: 'ADR-21',
            title: 'Estimate socket moderation flow',
            deck: expect.objectContaining({ id: 'fibonacci' }),
            finalEstimate: '8',
          },
        ],
      }),
    })
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.not.objectContaining({
        estimatedStories: expect.anything(),
      }),
    )
  })

  it('validates estimate payloads before calling the domain command', () => {
    const { roomEmitter, estimateRecordHandler } = createHarness()
    const ack = vi.fn()

    estimateRecordHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        estimate: '8',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Final estimate details could not be validated.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns unauthorized for participant round-start commands without broadcasting', () => {
    const { roomEmitter, sessionCreateHandler, storyUpdateHandler, roundStartHandler } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can start a voting round.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns STORY_REQUIRED for round-start commands without a current story', () => {
    const { roomEmitter, store, sessionCreateHandler, roundStartHandler } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    const before = store.get('ABCD12')
    const ack = vi.fn()

    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.storyRequired,
        message: 'Choose a current story before starting a voting round.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns stable validation failures for malformed round-start payloads', () => {
    const { roomEmitter, roundStartHandler } = createHarness()
    const ack = vi.fn()

    roundStartHandler?.({ roomCode: 'ABCD12' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Round start details could not be validated.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns a stable failure when a round-start command throws before acknowledgement', () => {
    const { roomEmitter, store, sessionCreateHandler, roundStartHandler } = createHarness(
      undefined,
      undefined,
      undefined,
      {
        now: () => {
          throw new Error('clock failed')
        },
      },
    )
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      snapshot: {
        ...session.snapshot,
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: false,
        },
      },
    })
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.connectionUnavailable,
        message: 'Moderator command could not be completed. Please try again.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('acknowledges and broadcasts a sanitized snapshot after a valid participant vote', () => {
    const {
      roomEmitter,
      sessionCreateHandler,
      sessionJoinHandler,
      storyUpdateHandler,
      roundStartHandler,
      voteSubmitHandler,
    } = createHarness(undefined, undefined, undefined, {
      now: () => new Date('2026-07-03T13:00:00.000Z'),
    })
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Ana' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()

    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    voteSubmitHandler?.(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        participants: expect.arrayContaining([
          {
            id: 'participant-2',
            displayName: 'Ana',
            role: 'participant',
            connected: true,
            hasVoted: true,
          },
        ]),
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      }),
    })
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.objectContaining({
        roomCode: 'ABCD12',
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      }),
    )
    expect(JSON.stringify(roomEmitter.emit.mock.calls)).not.toContain('participant-token')
    expect(ack.mock.invocationCallOrder[0]).toBeLessThan(
      roomEmitter.emit.mock.invocationCallOrder[0],
    )
  })

  it('acknowledges and broadcasts a sanitized snapshot after a valid moderator vote', () => {
    const {
      roomEmitter,
      sessionCreateHandler,
      storyUpdateHandler,
      roundStartHandler,
      voteSubmitHandler,
    } = createHarness(undefined, undefined, undefined, {
      now: () => new Date('2026-07-03T13:10:00.000Z'),
    })
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()

    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    voteSubmitHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        participants: expect.arrayContaining([
          {
            id: 'participant-1',
            displayName: 'Maxi',
            role: 'moderator',
            connected: true,
            hasVoted: true,
          },
        ]),
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      }),
    })
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.objectContaining({
        roomCode: 'ABCD12',
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      }),
    )
    expect(JSON.stringify(roomEmitter.emit.mock.calls)).not.toContain('moderator-token')
    expect(JSON.stringify(roomEmitter.emit.mock.calls)).not.toContain('selectedCard')
    expect(ack.mock.invocationCallOrder[0]).toBeLessThan(
      roomEmitter.emit.mock.invocationCallOrder[0],
    )
  })

  it('returns validation failure for malformed vote payloads without broadcasting', () => {
    const { roomEmitter, voteSubmitHandler } = createHarness()
    const ack = vi.fn()

    voteSubmitHandler?.({ roomCode: 'ABCD12', value: '8' }, ack)

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Vote details could not be validated.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns validation failure for malformed moderator vote payloads without broadcasting', () => {
    const { roomEmitter, voteSubmitHandler } = createHarness()
    const ack = vi.fn()

    voteSubmitHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'short',
        value: '8',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Vote details could not be validated.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns unauthorized vote failures without mutation or broadcast', () => {
    const {
      roomEmitter,
      store,
      sessionCreateHandler,
      sessionJoinHandler,
      storyUpdateHandler,
      roundStartHandler,
      voteSubmitHandler,
    } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Ana' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )
    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    voteSubmitHandler?.(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-bad-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the participant can submit their vote.',
      },
    })
    expect(store.get('ABCD12')?.votes.size).toBe(0)
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('returns unauthorized moderator vote failures without mutation or broadcast', () => {
    const {
      roomEmitter,
      store,
      sessionCreateHandler,
      storyUpdateHandler,
      roundStartHandler,
      voteSubmitHandler,
    } = createHarness()
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )
    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    voteSubmitHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can submit their vote.',
      },
    })
    expect(store.get('ABCD12')?.votes.size).toBe(0)
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })

  it('acknowledges before broadcasting a sanitized revealed snapshot after a valid reveal command', () => {
    const {
      roomEmitter,
      sessionCreateHandler,
      sessionJoinHandler,
      storyUpdateHandler,
      roundStartHandler,
      voteSubmitHandler,
      roundRevealHandler,
    } = createHarness(undefined, undefined, undefined, {
      now: () => new Date('2026-07-03T13:30:00.000Z'),
    })
    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    sessionJoinHandler?.({ roomCode: 'ABCD12', displayName: 'Ana' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )
    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      vi.fn(),
    )
    voteSubmitHandler?.(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()
    const ack = vi.fn()

    roundRevealHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      ack,
    )

    expect(ack).toHaveBeenCalledWith({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        round: {
          active: true,
          revealed: true,
          voteCount: 1,
        },
        results: {
          votes: [
            {
              participantId: 'participant-2',
              displayName: 'Ana',
              role: 'participant',
              value: '8',
            },
          ],
        },
      }),
    })
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      SERVER_EVENTS.sessionSnapshot,
      expect.objectContaining({
        roomCode: 'ABCD12',
        results: expect.objectContaining({
          votes: expect.arrayContaining([
            expect.objectContaining({ participantId: 'participant-2', value: '8' }),
          ]),
        }),
      }),
    )
    expect(JSON.stringify(roomEmitter.emit.mock.calls)).not.toContain('participant-token')
    expect(ack.mock.invocationCallOrder[0]).toBeLessThan(
      roomEmitter.emit.mock.invocationCallOrder[0],
    )
  })

  it('returns reveal validation, authorization, and inactive-round failures without broadcasting', () => {
    const {
      roomEmitter,
      sessionCreateHandler,
      storyUpdateHandler,
      roundStartHandler,
      roundRevealHandler,
    } = createHarness()
    const ack = vi.fn()

    roundRevealHandler?.({ roomCode: 'ABCD12' }, ack)
    expect(ack).toHaveBeenLastCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Round reveal details could not be validated.',
      },
    })

    sessionCreateHandler?.({ moderatorName: 'Maxi' }, vi.fn())
    storyUpdateHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      vi.fn(),
    )

    roomEmitter.emit.mockClear()
    roundRevealHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      ack,
    )
    expect(ack).toHaveBeenLastCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.roundNotActive,
        message: 'Voting is not active for this session.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()

    roundStartHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      vi.fn(),
    )
    roomEmitter.emit.mockClear()

    roundRevealHandler?.(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
      },
      ack,
    )
    expect(ack).toHaveBeenLastCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can reveal round results.',
      },
    })

    roundRevealHandler?.(
      {
        roomCode: 'NOPE1',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      ack,
    )
    expect(ack).toHaveBeenLastCalledWith({
      ok: false,
      error: {
        code: ERROR_CODES.invalidRoomCode,
        message: 'Room code is invalid or inactive.',
      },
    })
    expect(roomEmitter.emit).not.toHaveBeenCalled()
  })
})
