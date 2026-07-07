import type { Server, Socket } from 'socket.io'
import {
  createSession,
  createSessionStore,
  joinSession,
  recordEstimate,
  resetRound,
  revealRound,
  removeJoinedParticipant,
  selectDeck,
  startRound,
  advanceStory,
  submitVote,
  updateStory,
  type CreateSessionDependencies,
  type JoinSessionDependencies,
  type JoinSessionDomainResult,
  type ModeratorSessionCommandDependencies,
  type ModeratorSessionCommandResult,
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
  AdvanceStoryCommandSchema,
  RecordEstimateCommandSchema,
  RoundResetCommandSchema,
  RevealRoundCommandSchema,
  SelectDeckCommandSchema,
  StartRoundCommandSchema,
  SubmitVoteCommandSchema,
  UpdateStoryCommandSchema,
} from '../../src/shared/schemas/command-schemas.js'
import { toPreRevealSessionSnapshot, type SnapshotViewer } from './snapshot-mapper.js'

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
type ModeratorSessionRuntimeDependencies = Omit<ModeratorSessionCommandDependencies, 'store'>

export interface RegisterSessionHandlersOptions {
  store?: CreateSessionDependencies['store']
  rateLimiter?: SocketRateLimiter
  createSessionDependencies?: CreateSessionRuntimeDependencies
  joinSessionDependencies?: JoinSessionRuntimeDependencies
  moderatorSessionDependencies?: ModeratorSessionRuntimeDependencies
}

export function registerSessionHandlers(
  io: SessionServer,
  {
    store = createSessionStore(),
    rateLimiter = createSocketRateLimiter(),
    createSessionDependencies = {},
    joinSessionDependencies = {},
    moderatorSessionDependencies = {},
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

      const snapshot = sanitizedSnapshot(result.roomCode, {
        participantId: moderator.id,
        role: 'moderator',
      })

      ack(createSuccessAck({ ...result, snapshot }))
      socket.emit(SERVER_EVENTS.sessionSnapshot, snapshot)
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

      const snapshot = sanitizedSnapshot(domainResult.data.roomCode, {
        participantId: domainResult.data.participantId,
        role: 'participant',
      })

      ack(createSuccessAck({ ...domainResult.data, snapshot }))
      emitSessionSnapshots(domainResult.data.roomCode)
    })

    socket.on(CLIENT_EVENTS.storyUpdate, (payload, ack) => {
      handleModeratorCommand({
        ack,
        payload,
        schema: UpdateStoryCommandSchema,
        validationMessage: 'Story update details could not be validated.',
        domainCommand: (command) =>
          updateStory(command, {
            store,
            ...moderatorSessionDependencies,
          }),
      })
    })

    socket.on(CLIENT_EVENTS.deckSelect, (payload, ack) => {
      handleModeratorCommand({
        ack,
        payload,
        schema: SelectDeckCommandSchema,
        validationMessage: 'Deck selection details could not be validated.',
        domainCommand: (command) =>
          selectDeck(command, {
            store,
            ...moderatorSessionDependencies,
          }),
      })
    })

    socket.on(CLIENT_EVENTS.roundStart, (payload, ack) => {
      handleModeratorCommand({
        ack,
        payload,
        schema: StartRoundCommandSchema,
        validationMessage: 'Round start details could not be validated.',
        domainCommand: (command) =>
          startRound(command, {
            store,
            ...moderatorSessionDependencies,
          }),
      })
    })

    socket.on(CLIENT_EVENTS.roundReveal, (payload, ack) => {
      handleModeratorCommand({
        ack,
        payload,
        schema: RevealRoundCommandSchema,
        validationMessage: 'Round reveal details could not be validated.',
        domainCommand: (command) =>
          revealRound(command, {
            store,
            ...moderatorSessionDependencies,
          }),
      })
    })

    socket.on(CLIENT_EVENTS.roundReset, (payload, ack) => {
      if (typeof ack !== 'function') {
        return
      }

      if (isModeratorCommandAttemptWithoutModeratorToken(payload)) {
        ack(
          createFailureAck({
            code: ERROR_CODES.unauthorized,
            message: 'Only the moderator can reset a voting round.',
          }),
        )
        return
      }

      handleModeratorCommand({
        ack,
        payload,
        schema: RoundResetCommandSchema,
        validationMessage: 'Round reset details could not be validated.',
        unavailableMessage: 'Round reset could not be completed. Please try again.',
        domainCommand: (command) =>
          resetRound(command, {
            store,
            ...moderatorSessionDependencies,
          }),
      })
    })

    socket.on(CLIENT_EVENTS.voteSubmit, (payload, ack) => {
      handleModeratorCommand({
        ack,
        payload,
        schema: SubmitVoteCommandSchema,
        validationMessage: 'Vote details could not be validated.',
        unavailableMessage: 'Vote could not be submitted. Please try again.',
        domainCommand: (command) =>
          submitVote(command, {
            store,
            ...moderatorSessionDependencies,
          }),
      })
    })

    socket.on(CLIENT_EVENTS.estimateRecord, (payload, ack) => {
      if (typeof ack !== 'function') {
        return
      }

      if (isEstimateAttemptWithoutModeratorToken(payload)) {
        ack(
          createFailureAck({
            code: ERROR_CODES.unauthorized,
            message: 'Only the moderator can record a final estimate.',
          }),
        )
        return
      }

      handleModeratorCommand({
        ack,
        payload,
        schema: RecordEstimateCommandSchema,
        validationMessage: 'Final estimate details could not be validated.',
        unavailableMessage: 'Final estimate could not be recorded. Please try again.',
        domainCommand: (command) =>
          recordEstimate(command, {
            store,
            ...moderatorSessionDependencies,
          }),
      })
    })

    socket.on(CLIENT_EVENTS.storyAdvance, (payload, ack) => {
      if (typeof ack !== 'function') {
        return
      }

      if (isModeratorCommandAttemptWithoutModeratorToken(payload)) {
        ack(
          createFailureAck({
            code: ERROR_CODES.unauthorized,
            message: 'Only the moderator can advance to the next story.',
          }),
        )
        return
      }

      handleModeratorCommand({
        ack,
        payload,
        schema: AdvanceStoryCommandSchema,
        validationMessage: 'Story advance details could not be validated.',
        unavailableMessage: 'Story advance could not be completed. Please try again.',
        domainCommand: (command) =>
          advanceStory(command, {
            store,
            ...moderatorSessionDependencies,
          }),
      })
    })

    socket.on('disconnect', () => {
      rateLimiter.reset(socket.id)
    })

    function handleModeratorCommand<TCommand>({
      ack,
      payload,
      schema,
      validationMessage,
      unavailableMessage = 'Moderator command could not be completed. Please try again.',
      domainCommand,
    }: {
      ack: unknown
      payload: unknown
      schema: {
        safeParse: (input: unknown) =>
          | { success: true; data: TCommand }
          | { success: false }
      }
      validationMessage: string
      unavailableMessage?: string
      domainCommand: (command: TCommand) => ModeratorSessionCommandResult
    }) {
      if (typeof ack !== 'function') {
        return
      }

      const parsedCommand = schema.safeParse(payload)

      if (!parsedCommand.success) {
        ack(
          createFailureAck({
            code: ERROR_CODES.validationFailed,
            message: validationMessage,
          }),
        )
        return
      }

      try {
        const result = domainCommand(parsedCommand.data)

        if (!result.ok) {
          ack(createFailureAck(result.error))
          return
        }

        const viewer = snapshotViewerForAck(result.data.roomCode, parsedCommand.data)
        const snapshot = sanitizedSnapshot(result.data.roomCode, viewer)

        ack(createSuccessAck(snapshot))
        emitSessionSnapshots(result.data.roomCode)
      } catch {
        ack(
          createFailureAck({
            code: ERROR_CODES.connectionUnavailable,
            message: unavailableMessage,
          }),
        )
      }
    }

    function sanitizedSnapshot(roomCode: string, viewer: SnapshotViewer) {
      const session = store.get(roomCode)

      if (!session) {
        throw new Error('Session state missing after successful command')
      }

      return toPreRevealSessionSnapshot(session, viewer)
    }

    function emitSessionSnapshots(roomCode: string) {
      const socketRegistry = io.sockets?.sockets
      const roomSocketIds = io.sockets?.adapter.rooms.get(roomCode)

      if (!socketRegistry || !roomSocketIds) {
        io.to(roomCode).emit(
          SERVER_EVENTS.sessionSnapshot,
          sanitizedSnapshot(roomCode, { participantId: '', role: 'participant' }),
        )
        return
      }

      for (const socketId of roomSocketIds) {
        const targetSocket = socketRegistry.get(socketId) as SessionSocket | undefined
        const identity = targetSocket?.data.identity

        if (!identity || identity.roomCode !== roomCode) {
          continue
        }

        targetSocket.emit(
          SERVER_EVENTS.sessionSnapshot,
          sanitizedSnapshot(roomCode, {
            participantId: identity.participantId,
            role: identity.role,
          }),
        )
      }
    }

    function snapshotViewerForAck(roomCode: string, command: unknown): SnapshotViewer {
      if (socket.data.identity?.roomCode === roomCode) {
        return {
          participantId: socket.data.identity.participantId,
          role: socket.data.identity.role,
        }
      }

      return inferSnapshotViewer(command, { allowModeratorFallback: false })
    }
  })
}

function inferSnapshotViewer(
  command: unknown,
  { allowModeratorFallback = true }: { allowModeratorFallback?: boolean } = {},
): SnapshotViewer {
  if (
    command &&
    typeof command === 'object' &&
    'participantId' in command &&
    typeof command.participantId === 'string'
  ) {
    return {
      participantId: command.participantId,
      role: 'participant',
    }
  }

  if (!allowModeratorFallback) {
    return {
      participantId: '',
      role: 'participant',
    }
  }

  return {
    participantId: 'moderator',
    role: 'moderator',
  }
}

function isEstimateAttemptWithoutModeratorToken(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return 'value' in payload && !('moderatorToken' in payload)
}

function isModeratorCommandAttemptWithoutModeratorToken(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return 'roomCode' in payload && !('moderatorToken' in payload)
}
