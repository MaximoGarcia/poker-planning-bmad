import type { CreateSessionCommand, JoinSessionCommand } from '../schemas/command-schemas.js'
import type { SessionSnapshot } from './snapshots.js'
import type { AckCallback } from './ack.js'

export const CLIENT_EVENTS = {
  sessionCreate: 'session:create',
  sessionJoin: 'session:join',
  storyUpdate: 'story:update',
  deckSelect: 'deck:select',
  roundStart: 'round:start',
  voteSubmit: 'vote:submit',
  roundReveal: 'round:reveal',
  roundReset: 'round:reset',
  estimateRecord: 'estimate:record',
  storyAdvance: 'story:advance',
  sessionLeave: 'session:leave',
} as const

export const SERVER_EVENTS = {
  sessionSnapshot: 'session:snapshot',
  sessionError: 'session:error',
  sessionClosed: 'session:closed',
} as const

export type ClientEventName = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS]
export type ServerEventName = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS]

export interface ClientToServerEventPayloads {
  'session:create': CreateSessionCommand
  'session:join': JoinSessionCommand
  'story:update': { roomCode: string; storyId: string; title: string }
  'deck:select': { roomCode: string; deckId: string }
  'round:start': { roomCode: string }
  'vote:submit': { roomCode: string; value: string }
  'round:reveal': { roomCode: string }
  'round:reset': { roomCode: string }
  'estimate:record': { roomCode: string; estimate: string }
  'story:advance': { roomCode: string; storyId?: string }
  'session:leave': { roomCode: string }
}

export interface ServerToClientEventPayloads {
  'session:snapshot': SessionSnapshot
  'session:error': { code: string; message: string; details?: unknown }
  'session:closed': { reason: string }
}

export type ClientToServerEvents = {
  [EventName in keyof ClientToServerEventPayloads]: (
    payload: ClientToServerEventPayloads[EventName],
    ack?: AckCallback<SessionSnapshot>,
  ) => void
}

export type ServerToClientEvents = {
  [EventName in keyof ServerToClientEventPayloads]: (
    payload: ServerToClientEventPayloads[EventName],
  ) => void
}
