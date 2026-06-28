import type { SessionSnapshot } from '../../src/shared/contracts/snapshots.js'

export interface SessionState {
  roomCode: string
  moderatorToken: string
  moderatorParticipantId: string
  snapshot: SessionSnapshot
  votes: Map<string, string>
  estimatedStories: []
}

export interface SessionStore {
  has(roomCode: string): boolean
  get(roomCode: string): SessionState | undefined
  set(session: SessionState): void
}

export function createSessionStore(): SessionStore {
  const sessions = new Map<string, SessionState>()

  return {
    has(roomCode) {
      return sessions.has(roomCode)
    },
    get(roomCode) {
      return sessions.get(roomCode)
    },
    set(session) {
      sessions.set(session.roomCode, session)
    },
  }
}
