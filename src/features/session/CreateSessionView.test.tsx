import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { ERROR_CODES } from '@shared/contracts/errors'
import { PLANNING_DECKS } from '@shared/domain/decks'
import { DEFAULT_DECK_ID } from '@shared/domain/decks'
import { CreateSessionView } from './CreateSessionView'
import { moderatorTokenStorageKey, participantTokenStorageKey } from './session-storage'

const sessionSocketMock = vi.hoisted(() => ({
  connectionStatus: 'connected' as 'connecting' | 'connected' | 'disconnected',
  createSession: vi.fn(),
  joinSession: vi.fn(),
}))

const createSessionMock = sessionSocketMock.createSession
const joinSessionMock = sessionSocketMock.joinSession

vi.mock('./useSessionSocket', () => ({
  useSessionSocket: () => ({
    connectionStatus: sessionSocketMock.connectionStatus,
    createSession: createSessionMock,
    joinSession: joinSessionMock,
    latestSnapshot: undefined,
  }),
}))

const snapshot = {
  roomCode: 'ABCD12',
  deck: PLANNING_DECKS.fibonacci,
  story: null,
  participants: [
    {
      id: 'participant-1',
      displayName: 'Maxi',
      role: 'moderator' as const,
      connected: true,
      hasVoted: false,
    },
  ],
  round: {
    active: false,
    revealed: false,
    voteCount: 0,
  },
  updatedAt: '2026-06-28T16:00:00.000Z',
}

function renderCreateSessionView() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CreateSessionView />} />
        <Route path="/session/:roomCode/moderator" element={<h1>Moderator room</h1>} />
        <Route path="/session/:roomCode" element={<h1>Participant room</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CreateSessionView', () => {
  beforeEach(() => {
    createSessionMock.mockReset()
    joinSessionMock.mockReset()
    sessionSocketMock.connectionStatus = 'connected'
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    })
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('creates a session, stores the moderator token in sessionStorage, and navigates', async () => {
    createSessionMock.mockResolvedValue({
      ok: true,
      data: {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        snapshot,
      },
    })

    renderCreateSessionView()
    fireEvent.change(screen.getByLabelText('Moderator name'), { target: { value: 'Maxi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create session' }))

    await screen.findByRole('heading', { name: 'Moderator room' })

    expect(createSessionMock).toHaveBeenCalledWith({
      moderatorName: 'Maxi',
      deckId: DEFAULT_DECK_ID,
    })
    expect(window.sessionStorage.getItem(moderatorTokenStorageKey('ABCD12'))).toBe(
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    expect(window.localStorage.length).toBe(0)
  })

  it('shows a readable stable-code error and does not store a token', async () => {
    createSessionMock.mockResolvedValue({
      ok: false,
      error: {
        code: ERROR_CODES.rateLimited,
        message: 'raw server message',
      },
    })

    renderCreateSessionView()
    fireEvent.click(screen.getByRole('button', { name: 'Create session' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many attempts. Please wait a moment and try again.',
      )
    })

    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.length).toBe(0)
  })

  it('prevents duplicate in-flight create requests', () => {
    createSessionMock.mockReturnValue(new Promise(() => undefined))

    renderCreateSessionView()
    const form = document.querySelector('form')

    if (!form) {
      throw new Error('Expected create session form to render')
    }

    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(createSessionMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('recovers when the create request rejects unexpectedly', async () => {
    createSessionMock.mockRejectedValue(new Error('socket failed'))

    renderCreateSessionView()
    fireEvent.click(screen.getByRole('button', { name: 'Create session' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not create a session. Please try again.')
    })
    expect(screen.getByRole('button', { name: 'Create session' })).toBeEnabled()
  })

  it('shows disconnected socket state distinctly from connecting', () => {
    sessionSocketMock.connectionStatus = 'disconnected'

    renderCreateSessionView()

    expect(screen.getByText('Live connection unavailable')).toBeInTheDocument()
  })

  it('joins a session, stores the participant token in sessionStorage, and navigates', async () => {
    joinSessionMock.mockResolvedValue({
      ok: true,
      data: {
        roomCode: 'ABCD12',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        participantId: 'participant-2',
        displayName: 'Ana',
        snapshot: {
          ...snapshot,
          participants: [
            ...snapshot.participants,
            {
              id: 'participant-2',
              displayName: 'Ana',
              role: 'participant' as const,
              connected: true,
              hasVoted: false,
            },
          ],
        },
      },
    })

    renderCreateSessionView()
    fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'abcd12' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join session' }))

    await screen.findByRole('heading', { name: 'Participant room' })

    expect(joinSessionMock).toHaveBeenCalledWith({
      roomCode: 'ABCD12',
      displayName: 'Ana',
    })
    expect(window.sessionStorage.getItem(participantTokenStorageKey('ABCD12', 'participant-2'))).toBe(
      'participant-token-abcdefghijklmnopqrstuvwxyz',
    )
    expect(window.localStorage.length).toBe(0)
  })

  it('shows a readable join error without storing a token', async () => {
    joinSessionMock.mockResolvedValue({
      ok: false,
      error: {
        code: ERROR_CODES.invalidRoomCode,
        message: 'raw server message',
      },
    })

    renderCreateSessionView()
    fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'NOPE1' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join session' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'That room code is not active. Check it and try again.',
      )
    })
    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.length).toBe(0)
  })
})

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}
