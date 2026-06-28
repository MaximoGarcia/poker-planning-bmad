import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import type { Ack } from '@shared/contracts/ack'
import { SERVER_EVENTS } from '@shared/contracts/socket-events'
import type { CreateSessionResult } from '@shared/contracts/socket-events'
import { useSessionSocket } from './useSessionSocket'

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

    render(<Harness />)

    expect(screen.getByText('disconnected')).toBeInTheDocument()
  })

  it('returns a stable failure when create is attempted while disconnected', async () => {
    socketMock.connected = false

    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
    expect(socketMock.emit).not.toHaveBeenCalled()
  })

  it('uses an acknowledgement timeout for create-session commands', async () => {
    render(<Harness />)
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

    render(<Harness />)
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

    render(<Harness />)

    expect(screen.getByTestId('snapshot-room')).toHaveTextContent('no snapshot')
  })
})
