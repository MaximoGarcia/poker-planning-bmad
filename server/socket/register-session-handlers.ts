import type { Server, Socket } from 'socket.io'
import {
  createSession,
  createSessionStore,
  joinSession,
  removeJoinedParticipant,
  type CreateSessionDependencies,
  type JoinSessionDependencies,
  type JoinSessionDomainResult,
} from '../domain/index.js'
import { createSocketRateLimiter, type SocketRateLimiter } from '../security/index.js'
import { createFailureAck, createSuccessAck } from '../../src/shared/contracts/ack.js'
import { ERROR_CODES } from '../../src/shared/contracts/errors.js'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../src/shared/contracts/socket-events.js'
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../src/shared/contracts/socket-events.js'
import type { SessionIdentity } from '../../src/shared/domain/session-types.js'
import {
  CreateSessionCommandSchema,
  JoinSessionCommandSchema,
} from '../../src/shared/schemas/command-schemas.js'

interface SessionSocketData {
  connectedAt?: string
  identity?: SessionIdentity
}

type SessionSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SessionSocketData
>
type SessionServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SessionSocketData
>

type CreateSessionRuntimeDependencies = Omit<CreateSessionDependencies, 'store'>
type JoinSessionRuntimeDependencies = Omit<JoinSessionDependencies, 'store'>

export interface RegisterSessionHandlersOptions {
  store?: CreateSessionDependencies['store']
  rateLimiter?: SocketRateLimiter
  createSessionDependencies?: CreateSessionRuntimeDependencies
  joinSessionDependencies?: JoinSessionRuntimeDependencies
}

export function registerSessionHandlers(
  io: SessionServer,
  {
    store = createSessionStore(),
    rateLimiter = createSocketRateLimiter(),
    createSessionDependencies = {},
    joinSessionDependencies = {},
  }: RegisterSessionHandlersOptions = {},
) {
  const now = createSessionDependencies.now ?? (() => new Date())

  io.on('connection', (socket: SessionSocket) => {
    socket.data.connectedAt = now().toISOString()

    socket.on(CLIENT_EVENTS.sessionCreate, (payload, ack) => {
      if (typeof ack !== 'function') {
        return
      }

      const rateLimitResult = rateLimiter.consume(socket.id)

      if (!rateLimitResult.allowed) {
        ack(
          createFailureAck({
            code: ERROR_CODES.rateLimited,
            message: 'Too many session create attempts. Please wait before trying again.',
            details: { retryAfterMs: rateLimitResult.retryAfterMs },
          }),
        )
        return
      }

      const parsedCommand = CreateSessionCommandSchema.safeParse(payload)

      if (!parsedCommand.success) {
        ack(
          createFailureAck({
            code: ERROR_CODES.validationFailed,
            message: 'Session details could not be validated.',
          }),
        )
        return
      }

      let result
      try {
        result = createSession(parsedCommand.data, {
          store,
          ...createSessionDependencies,
        })
      } catch {
        ack(
          createFailureAck({
            code: ERROR_CODES.sessionCreateFailed,
            message: 'Session could not be created. Please try again.',
          }),
        )
        return
      }
      const moderator = result.snapshot.participants[0]

      try {
        socket.join(result.roomCode)
        socket.data.identity = {
          roomCode: result.roomCode,
          participantId: moderator.id,
          role: 'moderator',
        }
      } catch {
        ack(
          createFailureAck({
            code: ERROR_CODES.sessionCreateFailed,
            message: 'Session could not be created. Please try again.',
          }),
        )
        return
      }

      ack(createSuccessAck(result))
      socket.emit(SERVER_EVENTS.sessionSnapshot, result.snapshot)
    })

    socket.on(CLIENT_EVENTS.sessionJoin, (payload, ack) => {
      if (typeof ack !== 'function') {
        return
      }

      const rateLimitResult = rateLimiter.consume(socket.id)

      if (!rateLimitResult.allowed) {
        ack(
          createFailureAck({
            code: ERROR_CODES.rateLimited,
            message: 'Too many session join attempts. Please wait before trying again.',
            details: { retryAfterMs: rateLimitResult.retryAfterMs },
          }),
        )
        return
      }

      const parsedCommand = JoinSessionCommandSchema.safeParse(payload)

      if (!parsedCommand.success) {
        ack(
          createFailureAck({
            code: ERROR_CODES.validationFailed,
            message: 'Session join details could not be validated.',
          }),
        )
        return
      }

      let domainResult: JoinSessionDomainResult

      try {
        domainResult = joinSession(parsedCommand.data, {
          store,
          ...joinSessionDependencies,
        })
      } catch {
        ack(
          createFailureAck({
            code: ERROR_CODES.sessionJoinFailed,
            message: 'Session could not be joined. Please try again.',
          }),
        )
        return
      }

      if (!domainResult.ok) {
        ack(createFailureAck(domainResult.error))
        return
      }

      try {
        socket.join(domainResult.data.roomCode)
        socket.data.identity = {
          roomCode: domainResult.data.roomCode,
          participantId: domainResult.data.participantId,
          role: 'participant',
        }
      } catch {
        removeJoinedParticipant(domainResult.data.roomCode, domainResult.data.participantId, {
          store,
          now,
        })
        ack(
          createFailureAck({
            code: ERROR_CODES.sessionJoinFailed,
            message: 'Session could not be joined. Please try again.',
          }),
        )
        return
      }

      ack(createSuccessAck(domainResult.data))
      io.to(domainResult.data.roomCode).emit(SERVER_EVENTS.sessionSnapshot, domainResult.data.snapshot)
    })

    socket.on('disconnect', () => {
      rateLimiter.reset(socket.id)
    })
  })
}
