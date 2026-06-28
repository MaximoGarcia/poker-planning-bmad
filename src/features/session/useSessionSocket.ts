import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { createSuccessAck, type Ack } from '@shared/contracts/ack'
import { ERROR_CODES } from '@shared/contracts/errors'
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ClientToServerEvents,
  type CreateSessionResult,
  type ServerToClientEvents,
} from '@shared/contracts/socket-events'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import type { CreateSessionCommand } from '@shared/schemas/command-schemas'
import { CreateSessionResultSchema, SessionSnapshotSchema } from '@shared/schemas/session-schemas'

type SessionClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>
type TimeoutSessionCreateSocket = {
  emit: (
    eventName: typeof CLIENT_EVENTS.sessionCreate,
    command: CreateSessionCommand,
    callback: (error: Error | null, ack?: Ack<CreateSessionResult>) => void,
  ) => void
}

const ACK_TIMEOUT_MS = 5_000

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface UseSessionSocketResult {
  connectionStatus: ConnectionStatus
  latestSnapshot: SessionSnapshot | null
  createSession: (command: CreateSessionCommand) => Promise<Ack<CreateSessionResult>>
}

export function useSessionSocket(): UseSessionSocketResult {
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

  const createSession = useCallback(
    (command: CreateSessionCommand) =>
      new Promise<Ack<CreateSessionResult>>((resolve) => {
        const socket = socketRef.current

        if (!socket?.connected) {
          resolve(createConnectionUnavailableAck())
          return
        }

        const socketWithTimeout = socket.timeout(ACK_TIMEOUT_MS) as unknown as TimeoutSessionCreateSocket

        socketWithTimeout.emit(
          CLIENT_EVENTS.sessionCreate,
          command,
          (error: Error | null, ack?: Ack<CreateSessionResult>) => {
            if (error || !ack) {
              resolve(createConnectionUnavailableAck())
              return
            }

            if (!ack.ok) {
              resolve(ack)
              return
            }

            const parsedResult = CreateSessionResultSchema.safeParse(ack.data)

            if (!parsedResult.success) {
              resolve(createConnectionUnavailableAck())
              return
            }

            resolve(createSuccessAck(parsedResult.data))
          },
        )
      }),
    [],
  )

  return {
    connectionStatus,
    latestSnapshot,
    createSession,
  }
}

function createConnectionUnavailableAck(): Ack<CreateSessionResult> {
  return {
    ok: false,
    error: {
      code: ERROR_CODES.connectionUnavailable,
      message: 'The live session connection is not available.',
    },
  }
}
