import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import type { Ack } from '@shared/contracts/ack'
import { SERVER_EVENTS } from '@shared/contracts/socket-events'
import type { CreateSessionResult, JoinSessionResult } from '@shared/contracts/socket-events'
import { SessionSocketProvider, useSessionSocket } from './useSessionSocket'

const socketMock = {
  connected: true,
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn(),
  timeout: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: () => socketMock,
}))

function Harness() {
  const { connectionStatus, createSession, latestSnapshot } = useSessionSocket()
  const [ack, setAck] = useState<Ack<CreateSessionResult> | null>(null)

  async function handleCreate() {
    setAck(
      await createSession({
        moderatorName: 'Maxi',
        deckId: 'fibonacci',
      }),
    )
  }

  return (
    <>
      <p>{connectionStatus}</p>
      <p data-testid="snapshot-room">{latestSnapshot?.roomCode ?? 'no snapshot'}</p>
      <button onClick={handleCreate} type="button">
        Create
      </button>
      {ack && <p role="alert">{ack.ok ? 'ok' : ack.error.code}</p>}
    </>
  )
}

function JoinHarness() {
  const { joinSession } = useSessionSocket()
  const [ack, setAck] = useState<Ack<JoinSessionResult> | null>(null)

  async function handleJoin() {
    setAck(
      await joinSession({
        roomCode: 'ABCD12',
        displayName: 'Ana',
      }),
    )
  }

  return (
    <>
      <button onClick={handleJoin} type="button">
        Join
      </button>
      {ack && <p role="alert">{ack.ok ? ack.data.displayName : ack.error.code}</p>}
    </>
  )
}

function renderWithSocketProvider(ui: ReactNode) {
  return render(<SessionSocketProvider>{ui}</SessionSocketProvider>)
}

function ProviderLifetimeHarness() {
  const [route, setRoute] = useState<'entry' | 'participant'>('entry')

  return (
    <SessionSocketProvider>
      <button onClick={() => setRoute('participant')} type="button">
        Switch route
      </button>
      {route === 'entry' ? <SocketConsumer label="entry" /> : <SocketConsumer label="participant" />}
    </SessionSocketProvider>
  )
}

function SocketConsumer({ label }: { label: string }) {
  useSessionSocket()

  return <p>{label}</p>
}

describe('useSessionSocket', () => {
  beforeEach(() => {
    socketMock.connected = true
    socketMock.disconnect.mockReset()
    socketMock.emit.mockReset()
    socketMock.on.mockReset()
    socketMock.removeAllListeners.mockReset()
    socketMock.timeout.mockReset()
    socketMock.timeout.mockReturnValue({
      emit: vi.fn((_event, _command, callback) => {
        callback(new Error('ack timeout'))
      }),
    })
  })

  it('marks the connection disconnected when the initial connection fails', () => {
    socketMock.on.mockImplementation((eventName, callback) => {
      if (eventName === 'connect_error') {
        callback()
      }
      return socketMock
    })

    renderWithSocketProvider(<Harness />)

    expect(screen.getByText('disconnected')).toBeInTheDocument()
  })

  it('returns a stable failure when create is attempted while disconnected', async () => {
    socketMock.connected = false

    renderWithSocketProvider(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
    expect(socketMock.emit).not.toHaveBeenCalled()
  })

  it('uses an acknowledgement timeout for create-session commands', async () => {
    renderWithSocketProvider(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(socketMock.timeout).toHaveBeenCalledWith(5000)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
  })

  it('converts malformed success acknowledgements into a stable failure', async () => {
    socketMock.timeout.mockReturnValue({
      emit: vi.fn((_event, _command, callback) => {
        callback(null, {
          ok: true,
          data: {
            roomCode: 'ABCD12',
          },
        })
      }),
    })

    renderWithSocketProvider(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
  })

  it('ignores malformed session snapshots from the socket', () => {
    socketMock.on.mockImplementation((eventName, callback) => {
      if (eventName === SERVER_EVENTS.sessionSnapshot) {
        callback({ roomCode: '' })
      }
      return socketMock
    })

    renderWithSocketProvider(<Harness />)

    expect(screen.getByTestId('snapshot-room')).toHaveTextContent('no snapshot')
  })

  it('uses an acknowledgement timeout for join-session commands', async () => {
    renderWithSocketProvider(<JoinHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Join' }))

    await waitFor(() => {
      expect(socketMock.timeout).toHaveBeenCalledWith(5000)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
  })

  it('validates join success acknowledgements before returning them', async () => {
    socketMock.timeout.mockReturnValue({
      emit: vi.fn((_event, _command, callback) => {
        callback(null, {
          ok: true,
          data: {
            roomCode: 'ABCD12',
            participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
            participantId: 'participant-2',
            displayName: 'Ana',
            snapshot: {
              roomCode: 'ABCD12',
              deck: {
                id: 'fibonacci',
                label: 'Fibonacci',
                values: ['1', '2', '3'],
              },
              story: null,
              participants: [
                {
                  id: 'participant-2',
                  displayName: 'Ana',
                  role: 'participant',
                  connected: true,
                  hasVoted: false,
                },
              ],
              round: {
                active: false,
                revealed: false,
                voteCount: 0,
              },
              updatedAt: '2026-07-02T12:00:00.000Z',
            },
          },
        })
      }),
    })

    renderWithSocketProvider(<JoinHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Join' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('Ana')
  })

  it('keeps the socket alive when route content changes under the provider', () => {
    render(<ProviderLifetimeHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch route' }))

    expect(screen.getByText('participant')).toBeInTheDocument()
    expect(socketMock.disconnect).not.toHaveBeenCalled()
  })
})
