import { randomUUID } from 'node:crypto'
import { PLANNING_DECKS, type PlanningDeckId } from '../../src/shared/domain/decks.js'
import { ERROR_CODES, type ErrorCode } from '../../src/shared/contracts/errors.js'
import {
  DISPLAY_NAME_MAX_LENGTH,
  type CreateSessionCommand,
  type JoinSessionCommand,
} from '../../src/shared/schemas/command-schemas.js'
import type { CreateSessionResult, JoinSessionResult } from '../../src/shared/contracts/socket-events.js'
import {
  generateModeratorToken as generateDefaultModeratorToken,
  generateParticipantToken as generateDefaultParticipantToken,
} from '../security/capability-tokens.js'
import { generateRoomCode, generateUniqueRoomCode } from './room-code.js'
import type { SessionStore } from './session-store.js'

export interface CreateSessionDependencies {
  store: SessionStore
  generateRoomCode?: () => string
  generateModeratorToken?: () => string
  generateParticipantId?: () => string
  now?: () => Date
}

export interface JoinSessionDependencies {
  store: SessionStore
  generateParticipantToken?: () => string
  generateParticipantId?: () => string
  now?: () => Date
}

export type JoinSessionDomainResult =
  | {
      ok: true
      data: JoinSessionResult
    }
  | {
      ok: false
      error: {
        code: ErrorCode
        message: string
      }
    }

export function createSession(
  command: CreateSessionCommand,
  {
    store,
    generateRoomCode: generateCandidate = generateRoomCode,
    generateModeratorToken = generateDefaultModeratorToken,
    generateParticipantId = randomUUID,
    now = () => new Date(),
  }: CreateSessionDependencies,
): CreateSessionResult {
  const roomCode = generateUniqueRoomCode({
    isTaken: (candidate) => store.has(candidate),
    generateCandidate,
  })
  const moderatorToken = generateModeratorToken()
  const moderatorParticipantId = generateParticipantId()
  const deckId: PlanningDeckId = command.deckId
  const snapshot = {
    roomCode,
    deck: PLANNING_DECKS[deckId],
    story: null,
    participants: [
      {
        id: moderatorParticipantId,
        displayName: command.moderatorName,
        role: 'moderator' as const,
        connected: true,
        hasVoted: false,
      },
    ],
    round: {
      active: false,
      revealed: false,
      voteCount: 0,
    },
    updatedAt: now().toISOString(),
  }

  store.set({
    roomCode,
    moderatorToken,
    moderatorParticipantId,
    participantTokens: new Map(),
    snapshot,
    votes: new Map(),
    estimatedStories: [],
  })

  return {
    roomCode,
    moderatorToken,
    snapshot,
  }
}

export function joinSession(
  command: JoinSessionCommand,
  {
    store,
    generateParticipantToken = generateDefaultParticipantToken,
    generateParticipantId = randomUUID,
    now = () => new Date(),
  }: JoinSessionDependencies,
): JoinSessionDomainResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return {
      ok: false,
      error: {
        code: ERROR_CODES.invalidRoomCode,
        message: 'Room code is invalid or inactive.',
      },
    }
  }

  const participantId = generateParticipantId()
  const participantToken = generateParticipantToken()
  const displayName = disambiguateDisplayName(
    command.displayName,
    session.snapshot.participants.map((participant) => participant.displayName),
  )
  const snapshot = {
    ...session.snapshot,
    participants: [
      ...session.snapshot.participants,
      {
        id: participantId,
        displayName,
        role: 'participant' as const,
        connected: true,
        hasVoted: false,
      },
    ],
    updatedAt: now().toISOString(),
  }

  session.participantTokens.set(participantId, participantToken)
  store.set({
    ...session,
    snapshot,
  })

  return {
    ok: true,
    data: {
      roomCode: command.roomCode,
      participantToken,
      participantId,
      displayName,
      snapshot,
    },
  }
}

export function removeJoinedParticipant(
  roomCode: string,
  participantId: string,
  { store, now = () => new Date() }: { store: SessionStore; now?: () => Date },
): void {
  const session = store.get(roomCode)

  if (!session || !session.participantTokens.has(participantId)) {
    return
  }

  session.participantTokens.delete(participantId)
  store.set({
    ...session,
    snapshot: {
      ...session.snapshot,
      participants: session.snapshot.participants.filter(
        (participant) => participant.id !== participantId || participant.role !== 'participant',
      ),
      updatedAt: now().toISOString(),
    },
  })
}

function disambiguateDisplayName(displayName: string, existingDisplayNames: string[]): string {
  const existing = new Set(existingDisplayNames)

  if (!existing.has(displayName)) {
    return displayName
  }

  let suffix = 2
  let candidate = suffixedDisplayName(displayName, suffix)

  while (existing.has(candidate)) {
    suffix += 1
    candidate = suffixedDisplayName(displayName, suffix)
  }

  return candidate
}

function suffixedDisplayName(displayName: string, suffix: number): string {
  const suffixText = ` (${suffix})`
  const baseLength = Math.max(DISPLAY_NAME_MAX_LENGTH - suffixText.length, 0)

  return `${displayName.slice(0, baseLength)}${suffixText}`
}
