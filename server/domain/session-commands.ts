import { randomUUID } from 'node:crypto'
import { PLANNING_DECKS, type PlanningDeckId } from '../../src/shared/domain/decks.js'
import { ERROR_CODES, type ErrorCode } from '../../src/shared/contracts/errors.js'
import {
  DISPLAY_NAME_MAX_LENGTH,
  type CreateSessionCommand,
  type AdvanceStoryCommand,
  type JoinSessionCommand,
  type RecordEstimateCommand,
  type RoundResetCommand,
  type RevealRoundCommand,
  type SelectDeckCommand,
  type StartRoundCommand,
  type SubmitVoteCommand,
  type UpdateStoryCommand,
} from '../../src/shared/schemas/command-schemas.js'
import type {
  CreateSessionResult,
  JoinSessionResult,
} from '../../src/shared/contracts/socket-events.js'
import type { SessionSnapshot } from '../../src/shared/contracts/snapshots.js'
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

export interface ModeratorSessionCommandDependencies {
  store: SessionStore
  now?: () => Date
}

export type JoinSessionDomainResult =
  | DomainSuccessResult<JoinSessionResult>
  | DomainFailureResult

export type ModeratorSessionCommandResult =
  | DomainSuccessResult<SessionSnapshot>
  | DomainFailureResult

type DomainSuccessResult<TData> = {
  ok: true
  data: TData
}

type DomainFailureResult = {
  ok: false
  error: {
    code: ErrorCode
    message: string
  }
}

export function updateStory(
  command: UpdateStoryCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return invalidRoomCodeResult()
  }

  if (session.moderatorToken !== command.moderatorToken) {
    return unauthorizedResult()
  }

  if (session.snapshot.round.active) {
    return storyLockedResult()
  }

  const snapshot = {
    ...session.snapshot,
    story: {
      id: command.storyId,
      title: command.title,
      locked: false,
    },
    updatedAt: now().toISOString(),
  }

  store.set({
    ...session,
    snapshot,
  })

  return {
    ok: true,
    data: snapshot,
  }
}

export function selectDeck(
  command: SelectDeckCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return invalidRoomCodeResult()
  }

  if (session.moderatorToken !== command.moderatorToken) {
    return unauthorizedResult()
  }

  if (session.snapshot.round.active) {
    return storyLockedResult()
  }

  const deckId: PlanningDeckId = command.deckId
  const snapshot = {
    ...session.snapshot,
    deck: PLANNING_DECKS[deckId],
    story: session.snapshot.story
      ? {
          ...session.snapshot.story,
          locked: false,
        }
      : null,
    updatedAt: now().toISOString(),
  }

  store.set({
    ...session,
    snapshot,
  })

  return {
    ok: true,
    data: snapshot,
  }
}

export function startRound(
  command: StartRoundCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return invalidRoomCodeResult()
  }

  if (session.moderatorToken !== command.moderatorToken) {
    return roundUnauthorizedResult()
  }

  if (!session.snapshot.story) {
    return storyRequiredResult()
  }

  const snapshot = {
    ...session.snapshot,
    story: {
      ...session.snapshot.story,
      locked: true,
    },
    participants: session.snapshot.participants.map((participant) => ({
      ...participant,
      hasVoted: false,
    })),
    round: {
      active: true,
      revealed: false,
      voteCount: 0,
    },
    results: null,
    updatedAt: now().toISOString(),
  }

  store.set({
    ...session,
    votes: new Map(),
    snapshot,
  })

  return {
    ok: true,
    data: snapshot,
  }
}

export function revealRound(
  command: RevealRoundCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return invalidRoomCodeResult()
  }

  if (session.moderatorToken !== command.moderatorToken) {
    return revealUnauthorizedResult()
  }

  if (!session.snapshot.round.active) {
    return roundNotActiveResult()
  }

  if (session.snapshot.round.revealed) {
    return {
      ok: true,
      data: session.snapshot,
    }
  }

  const results = {
    votes: Array.from(session.votes.entries()).flatMap(([participantId, value]) => {
      const participant = session.snapshot.participants.find(
        (candidate) => candidate.id === participantId,
      )

      return participant
        ? [
            {
              participantId,
              displayName: participant.displayName,
              role: participant.role,
              value,
            },
          ]
        : []
    }),
  }

  const snapshot = {
    ...session.snapshot,
    round: {
      ...session.snapshot.round,
      active: true,
      revealed: true,
      voteCount: session.votes.size,
    },
    results,
    updatedAt: now().toISOString(),
  }

  store.set({
    ...session,
    snapshot,
  })

  return {
    ok: true,
    data: snapshot,
  }
}

export function resetRound(
  command: RoundResetCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return invalidRoomCodeResult()
  }

  if (session.moderatorToken !== command.moderatorToken) {
    return roundResetUnauthorizedResult()
  }

  if (!session.snapshot.round.active) {
    return roundNotActiveResult()
  }

  const snapshot = {
    ...session.snapshot,
    story: session.snapshot.story
      ? {
          ...session.snapshot.story,
          locked: false,
        }
      : null,
    participants: session.snapshot.participants.map((participant) => ({
      ...participant,
      hasVoted: false,
    })),
    round: inactiveRoundSnapshot(),
    results: null,
    updatedAt: now().toISOString(),
  }

  store.set({
    ...session,
    votes: new Map(),
    snapshot,
  })

  return {
    ok: true,
    data: snapshot,
  }
}

export function advanceStory(
  command: AdvanceStoryCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return invalidRoomCodeResult()
  }

  if (session.moderatorToken !== command.moderatorToken) {
    return advanceStoryUnauthorizedResult()
  }

  const currentStory = session.snapshot.story

  if (!currentStory) {
    return storyRequiredResult()
  }

  if (!session.estimatedStories.some((estimatedStory) => estimatedStory.storyId === currentStory.id)) {
    return finalEstimateRequiredResult()
  }

  const snapshot = {
    ...session.snapshot,
    story: null,
    participants: session.snapshot.participants.map((participant) => ({
      ...participant,
      hasVoted: false,
    })),
    round: inactiveRoundSnapshot(),
    results: null,
    updatedAt: now().toISOString(),
  }

  store.set({
    ...session,
    votes: new Map(),
    snapshot,
  })

  return {
    ok: true,
    data: snapshot,
  }
}

export function submitVote(
  command: SubmitVoteCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return invalidRoomCodeResult()
  }

  const voter = resolveVoteActor(command, session)

  if (!voter) {
    return isModeratorVoteCommand(command)
      ? moderatorVoteUnauthorizedResult()
      : participantUnauthorizedResult()
  }

  if (!session.snapshot.round.active) {
    return roundNotActiveResult()
  }

  if (session.snapshot.round.revealed) {
    return voteLockedResult()
  }

  if (!session.snapshot.deck.values.includes(command.value)) {
    return invalidVoteValueResult()
  }

  const votes = new Map(session.votes)
  votes.set(voter.participantId, command.value)

  const snapshot = {
    ...session.snapshot,
    participants: session.snapshot.participants.map((candidate) =>
      candidate.id === voter.participantId && candidate.role === voter.role
        ? {
            ...candidate,
            hasVoted: true,
          }
        : candidate,
    ),
    round: {
      ...session.snapshot.round,
      voteCount: votes.size,
    },
    updatedAt: now().toISOString(),
  }

  store.set({
    ...session,
    votes,
    snapshot,
  })

  return {
    ok: true,
    data: snapshot,
  }
}

export function recordEstimate(
  command: RecordEstimateCommand,
  { store, now = () => new Date() }: ModeratorSessionCommandDependencies,
): ModeratorSessionCommandResult {
  const session = store.get(command.roomCode)

  if (!session) {
    return invalidRoomCodeResult()
  }

  if (session.moderatorToken !== command.moderatorToken) {
    return recordEstimateUnauthorizedResult()
  }

  if (!session.snapshot.story) {
    return storyRequiredResult()
  }

  if (!session.snapshot.round.active || !session.snapshot.round.revealed) {
    return resultsNotRevealedResult()
  }

  if (!session.snapshot.deck.values.includes(command.value)) {
    return invalidEstimateValueResult()
  }

  const estimatedStory = {
    storyId: session.snapshot.story.id,
    title: session.snapshot.story.title,
    deck: {
      id: session.snapshot.deck.id,
      label: session.snapshot.deck.label,
      values: [...session.snapshot.deck.values],
    },
    finalEstimate: command.value,
  }
  const existingIndex = session.estimatedStories.findIndex(
    (candidate) => candidate.storyId === estimatedStory.storyId,
  )
  const estimatedStories =
    existingIndex >= 0
      ? session.estimatedStories.map((candidate, index) =>
          index === existingIndex ? estimatedStory : candidate,
        )
      : [...session.estimatedStories, estimatedStory]
  const snapshot = {
    ...session.snapshot,
    updatedAt: now().toISOString(),
  }

  store.set({
    ...session,
    estimatedStories,
    snapshot,
  })

  return {
    ok: true,
    data: snapshot,
  }
}

function isModeratorVoteCommand(
  command: SubmitVoteCommand,
): command is Extract<SubmitVoteCommand, { moderatorToken: string }> {
  return 'moderatorToken' in command
}

function resolveVoteActor(
  command: SubmitVoteCommand,
  session: NonNullable<ReturnType<SessionStore['get']>>,
): { participantId: string; role: 'moderator' | 'participant' } | null {
  if (isModeratorVoteCommand(command)) {
    const moderator = session.snapshot.participants.find(
      (candidate) =>
        candidate.id === session.moderatorParticipantId && candidate.role === 'moderator',
    )

    return moderator && session.moderatorToken === command.moderatorToken
      ? {
          participantId: moderator.id,
          role: 'moderator',
        }
      : null
  }

  const participant = session.snapshot.participants.find(
    (candidate) => candidate.id === command.participantId,
  )
  const participantToken = session.participantTokens.get(command.participantId)

  if (
    !participant ||
    participant.role !== 'participant' ||
    participantToken !== command.participantToken
  ) {
    return null
  }

  return {
    participantId: command.participantId,
    role: 'participant',
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
    results: null,
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
    return invalidRoomCodeResult()
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

function invalidRoomCodeResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.invalidRoomCode,
      message: 'Room code is invalid or inactive.',
    },
  }
}

function unauthorizedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.unauthorized,
      message: 'Only the moderator can update the current story or deck.',
    },
  }
}

function roundUnauthorizedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.unauthorized,
      message: 'Only the moderator can start a voting round.',
    },
  }
}

function roundResetUnauthorizedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.unauthorized,
      message: 'Only the moderator can reset a voting round.',
    },
  }
}

function advanceStoryUnauthorizedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.unauthorized,
      message: 'Only the moderator can advance to the next story.',
    },
  }
}

function revealUnauthorizedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.unauthorized,
      message: 'Only the moderator can reveal round results.',
    },
  }
}

function participantUnauthorizedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.unauthorized,
      message: 'Only the participant can submit their vote.',
    },
  }
}

function moderatorVoteUnauthorizedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.unauthorized,
      message: 'Only the moderator can submit their vote.',
    },
  }
}

function roundNotActiveResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.roundNotActive,
      message: 'Voting is not active for this session.',
    },
  }
}

function voteLockedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.voteLocked,
      message: 'Votes are locked for this round.',
    },
  }
}

function invalidVoteValueResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.validationFailed,
      message: 'Vote value is not part of the active deck.',
    },
  }
}

function invalidEstimateValueResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.validationFailed,
      message: 'Final estimate must be one of the active deck cards.',
    },
  }
}

function recordEstimateUnauthorizedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.unauthorized,
      message: 'Only the moderator can record a final estimate.',
    },
  }
}

function resultsNotRevealedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.resultsNotRevealed,
      message: 'Reveal results before recording a final estimate.',
    },
  }
}

function finalEstimateRequiredResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.finalEstimateRequired,
      message: 'Record a final estimate before advancing to the next story.',
    },
  }
}

function storyRequiredResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.storyRequired,
      message: 'Choose a current story before starting a voting round.',
    },
  }
}

function storyLockedResult(): DomainFailureResult {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.storyLocked,
      message: 'The current story and deck cannot change during an active round.',
    },
  }
}

function inactiveRoundSnapshot() {
  return {
    active: false,
    revealed: false,
    voteCount: 0,
  }
}
