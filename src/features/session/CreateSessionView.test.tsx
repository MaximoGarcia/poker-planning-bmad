import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { ERROR_CODES } from '@shared/contracts/errors'
import { PLANNING_DECKS } from '@shared/domain/decks'
import { DEFAULT_DECK_ID } from '@shared/domain/decks'
import { CreateSessionView } from './CreateSessionView'
import { moderatorTokenStorageKey } from './session-storage'

const createSessionMock = vi.fn()

vi.mock('./useSessionSocket', () => ({
  useSessionSocket: () => ({
    connectionStatus: 'connected',
    createSession: createSessionMock,
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
      </Routes>
    </MemoryRouter>,
  )
}

describe('CreateSessionView', () => {
  beforeEach(() => {
    createSessionMock.mockReset()
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
