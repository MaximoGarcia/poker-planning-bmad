import type { PlanningDeckId } from './decks.js'

export const PARTICIPANT_ROLES = ['moderator', 'participant'] as const

export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number]

export interface SessionIdentity {
  roomCode: string
  participantId: string
  role: ParticipantRole
}

export interface SessionSettings {
  deckId: PlanningDeckId
}
