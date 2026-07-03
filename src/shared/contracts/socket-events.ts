import type {
  CreateSessionCommand,
  JoinSessionCommand,
  SelectDeckCommand,
  StartRoundCommand,
  RevealRoundCommand,
  SubmitVoteCommand,
  UpdateStoryCommand,
} from '../schemas/command-schemas.js'
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

export interface CreateSessionResult {
  roomCode: string
  moderatorToken: string
  snapshot: SessionSnapshot
}

export interface JoinSessionResult {
  roomCode: string
  participantToken: string
  participantId: string
  displayName: string
  snapshot: SessionSnapshot
}

export interface ClientToServerEventPayloads {
  'session:create': CreateSessionCommand
  'session:join': JoinSessionCommand
  'story:update': UpdateStoryCommand
  'deck:select': SelectDeckCommand
  'round:start': StartRoundCommand
  'vote:submit': SubmitVoteCommand
  'round:reveal': RevealRoundCommand
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

export interface ClientToServerEventAcknowledgements {
  'session:create': CreateSessionResult
  'session:join': JoinSessionResult
  'story:update': SessionSnapshot
  'deck:select': SessionSnapshot
  'round:start': SessionSnapshot
  'vote:submit': SessionSnapshot
  'round:reveal': SessionSnapshot
  'round:reset': SessionSnapshot
  'estimate:record': SessionSnapshot
  'story:advance': SessionSnapshot
  'session:leave': SessionSnapshot
}

export type ClientToServerEvents = {
  [EventName in keyof ClientToServerEventPayloads]: (
    payload: ClientToServerEventPayloads[EventName],
    ack?: AckCallback<ClientToServerEventAcknowledgements[EventName]>,
  ) => void
}

export type ServerToClientEvents = {
  [EventName in keyof ServerToClientEventPayloads]: (
    payload: ServerToClientEventPayloads[EventName],
  ) => void
}
