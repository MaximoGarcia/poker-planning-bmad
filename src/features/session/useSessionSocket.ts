import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Ack } from '@shared/contracts/ack'
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ClientToServerEvents,
  type CreateSessionResult,
  type ServerToClientEvents,
} from '@shared/contracts/socket-events'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import type { CreateSessionCommand } from '@shared/schemas/command-schemas'

type SessionClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

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
    socket.on('disconnect', () => setConnectionStatus('disconnected'))
    socket.on(SERVER_EVENTS.sessionSnapshot, (snapshot) => setLatestSnapshot(snapshot))

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

        if (!socket) {
          resolve({
            ok: false,
            error: {
              code: 'CONNECTION_UNAVAILABLE',
              message: 'The live session connection is not available.',
            },
          })
          return
        }

        socket.emit(CLIENT_EVENTS.sessionCreate, command, resolve)
      }),
    [],
  )

  return {
    connectionStatus,
    latestSnapshot,
    createSession,
  }
}
