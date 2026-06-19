import type { PlanningDeck } from '../domain/decks.js'
import type { ParticipantRole } from '../domain/session-types.js'

export interface ParticipantSnapshot {
  id: string
  displayName: string
  role: ParticipantRole
  connected: boolean
  hasVoted: boolean
}

export interface StorySnapshot {
  id: string
  title: string
  locked: boolean
}

export interface RoundSnapshot {
  active: boolean
  revealed: boolean
  voteCount: number
}

export interface SessionSnapshot {
  roomCode: string
  deck: PlanningDeck
  story: StorySnapshot | null
  participants: ParticipantSnapshot[]
  round: RoundSnapshot
  updatedAt: string
}
