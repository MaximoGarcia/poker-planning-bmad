import { randomUUID } from 'node:crypto'
import { PLANNING_DECKS, type PlanningDeckId } from '../../src/shared/domain/decks.js'
import type { CreateSessionCommand } from '../../src/shared/schemas/command-schemas.js'
import type { CreateSessionResult } from '../../src/shared/contracts/socket-events.js'
import { generateModeratorToken as generateDefaultModeratorToken } from '../security/capability-tokens.js'
import { generateRoomCode, generateUniqueRoomCode } from './room-code.js'
import type { SessionStore } from './session-store.js'

export interface CreateSessionDependencies {
  store: SessionStore
  generateRoomCode?: () => string
  generateModeratorToken?: () => string
  generateParticipantId?: () => string
  now?: () => Date
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
