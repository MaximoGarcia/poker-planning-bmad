import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { createSuccessAck, type Ack } from '@shared/contracts/ack'
import { ERROR_CODES } from '@shared/contracts/errors'
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ClientToServerEvents,
  type CreateSessionResult,
  type JoinSessionResult,
  type ServerToClientEvents,
} from '@shared/contracts/socket-events'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import type {
  CreateSessionCommand,
  JoinSessionCommand,
  SelectDeckCommand,
  StartRoundCommand,
  SubmitVoteCommand,
  UpdateStoryCommand,
} from '@shared/schemas/command-schemas'
import {
  CreateSessionResultSchema,
  JoinSessionResultSchema,
  SessionSnapshotAckSchema,
  SessionSnapshotSchema,
} from '@shared/schemas/session-schemas'

type SessionClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>
type TimeoutSessionSocket = {
  emit: (
    eventName: keyof ClientToServerEvents,
    command: unknown,
    callback: (error: Error | null, ack?: Ack<unknown>) => void,
  ) => void
}

const ACK_TIMEOUT_MS = 5_000

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface UseSessionSocketResult {
  connectionStatus: ConnectionStatus
  latestSnapshot: SessionSnapshot | null
  createSession: (command: CreateSessionCommand) => Promise<Ack<CreateSessionResult>>
  joinSession: (command: JoinSessionCommand) => Promise<Ack<JoinSessionResult>>
  updateStory: (command: UpdateStoryCommand) => Promise<Ack<SessionSnapshot>>
  selectDeck: (command: SelectDeckCommand) => Promise<Ack<SessionSnapshot>>
  startRound: (command: StartRoundCommand) => Promise<Ack<SessionSnapshot>>
  submitVote: (command: SubmitVoteCommand) => Promise<Ack<SessionSnapshot>>
}

const SessionSocketContext = createContext<UseSessionSocketResult | null>(null)

export function SessionSocketProvider({ children }: { children: ReactNode }) {
  const value = useSessionSocketConnection()

  return createElement(SessionSocketContext.Provider, { value }, children)
}

export function useSessionSocket(): UseSessionSocketResult {
  const context = useContext(SessionSocketContext)

  if (!context) {
    throw new Error('useSessionSocket must be used within SessionSocketProvider')
  }

  return context
}

function useSessionSocketConnection(): UseSessionSocketResult {
  const socketRef = useRef<SessionClientSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [latestSnapshot, setLatestSnapshot] = useState<SessionSnapshot | null>(null)

  useEffect(() => {
    const socket: SessionClientSocket = io()
    socketRef.current = socket

    socket.on('connect', () => setConnectionStatus('connected'))
    socket.on('connect_error', () => setConnectionStatus('disconnected'))
    socket.on('disconnect', () => setConnectionStatus('disconnected'))
    socket.on(SERVER_EVENTS.sessionSnapshot, (snapshot) => {
      const parsedSnapshot = SessionSnapshotSchema.safeParse(snapshot)

      if (parsedSnapshot.success) {
        setLatestSnapshot(parsedSnapshot.data)
      }
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const emitValidatedCommand = useCallback(
    <TAck,>(
      eventName: keyof ClientToServerEvents,
      command: unknown,
      schema: {
        safeParse: (input: unknown) => { success: true; data: TAck } | { success: false }
      },
      onSuccess?: (ackData: TAck) => void,
    ) =>
      new Promise<Ack<TAck>>((resolve) => {
        const socket = socketRef.current

        if (!socket?.connected) {
          resolve(createConnectionUnavailableAck())
          return
        }

        const socketWithTimeout = socket.timeout(ACK_TIMEOUT_MS) as unknown as TimeoutSessionSocket

        socketWithTimeout.emit(eventName, command, (error: Error | null, ack?: Ack<unknown>) => {
          if (error || !ack) {
            resolve(createConnectionUnavailableAck())
            return
          }

          if (!ack.ok) {
            resolve(ack as Ack<TAck>)
            return
          }

          const parsedResult = schema.safeParse(ack.data)

          if (!parsedResult.success) {
            resolve(createConnectionUnavailableAck())
            return
          }

          onSuccess?.(parsedResult.data)
          resolve(createSuccessAck(parsedResult.data))
        })
      }),
    [],
  )

  const createSession = useCallback(
    (command: CreateSessionCommand) =>
      emitValidatedCommand(CLIENT_EVENTS.sessionCreate, command, CreateSessionResultSchema),
    [emitValidatedCommand],
  )

  const joinSession = useCallback(
    (command: JoinSessionCommand) =>
      emitValidatedCommand(CLIENT_EVENTS.sessionJoin, command, JoinSessionResultSchema),
    [emitValidatedCommand],
  )

  const updateStory = useCallback(
    (command: UpdateStoryCommand) =>
      emitValidatedCommand(CLIENT_EVENTS.storyUpdate, command, SessionSnapshotAckSchema, setLatestSnapshot),
    [emitValidatedCommand],
  )

  const selectDeck = useCallback(
    (command: SelectDeckCommand) =>
      emitValidatedCommand(CLIENT_EVENTS.deckSelect, command, SessionSnapshotAckSchema, setLatestSnapshot),
    [emitValidatedCommand],
  )

  const startRound = useCallback(
    (command: StartRoundCommand) =>
      emitValidatedCommand(CLIENT_EVENTS.roundStart, command, SessionSnapshotAckSchema, setLatestSnapshot),
    [emitValidatedCommand],
  )

  const submitVote = useCallback(
    (command: SubmitVoteCommand) =>
      emitValidatedCommand(CLIENT_EVENTS.voteSubmit, command, SessionSnapshotAckSchema, setLatestSnapshot),
    [emitValidatedCommand],
  )

  return {
    connectionStatus,
    latestSnapshot,
    createSession,
    joinSession,
    updateStory,
    selectDeck,
    startRound,
    submitVote,
  }
}

function createConnectionUnavailableAck<T>(): Ack<T> {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.connectionUnavailable,
      message: 'The live session connection is not available.',
    },
  }
}
