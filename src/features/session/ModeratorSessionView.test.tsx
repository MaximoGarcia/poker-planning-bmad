import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { PLANNING_DECKS } from '@shared/domain/decks'
import { ModeratorSessionView } from './ModeratorSessionView'
import { moderatorTokenStorageKey } from './session-storage'

vi.mock('./useSessionSocket', () => ({
  useSessionSocket: () => ({
    connectionStatus: 'connected',
    createSession: vi.fn(),
    latestSnapshot: null,
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

function renderModeratorRoute(state?: unknown) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/session/ABCD12/moderator',
          state,
        },
      ]}
    >
      <Routes>
        <Route path="/session/:roomCode/moderator" element={<ModeratorSessionView />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ModeratorSessionView', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('shows the room code and empty story state from the returned snapshot', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )

    renderModeratorRoute({ snapshot })

    expect(screen.getByRole('heading', { name: 'Moderator room' })).toBeInTheDocument()
    expect(screen.getByText('ABCD12')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy room code' })).toBeInTheDocument()
    expect(screen.getByText('No active story yet')).toBeInTheDocument()
    expect(screen.queryByText(/moderator-token/i)).not.toBeInTheDocument()
  })

  it('shows a missing-session state when token and snapshot are unavailable', () => {
    renderModeratorRoute()

    expect(screen.getByRole('heading', { name: 'Session details unavailable' })).toBeInTheDocument()
    expect(screen.queryByText('No active story yet')).not.toBeInTheDocument()
  })

  it('keeps the copy control stable when clipboard write fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Copy room code' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('ABCD12')
    })
    expect(screen.getByRole('button', { name: 'Copy room code' })).toBeInTheDocument()
  })
})
