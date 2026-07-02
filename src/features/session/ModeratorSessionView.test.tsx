import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { PLANNING_DECKS } from '@shared/domain/decks'
import { ModeratorSessionView } from './ModeratorSessionView'
import { moderatorTokenStorageKey } from './session-storage'

const socketState = vi.hoisted(() => ({
  latestSnapshot: null as typeof snapshot | null,
}))

vi.mock('./useSessionSocket', () => ({
  useSessionSocket: () => ({
    connectionStatus: 'connected',
    createSession: vi.fn(),
    latestSnapshot: socketState.latestSnapshot,
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
    socketState.latestSnapshot = null
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
    expect(screen.getByText('No participants have joined yet.')).toBeInTheDocument()
    expect(screen.queryByText(/moderator-token/i)).not.toBeInTheDocument()
  })

  it('shows participant presence with duplicate display labels and status text', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    const snapshotWithParticipants = {
      ...snapshot,
      participants: [
        snapshot.participants[0],
        {
          id: 'participant-2',
          displayName: 'Maxi (2)',
          role: 'participant' as const,
          connected: true,
          hasVoted: false,
        },
        {
          id: 'participant-3',
          displayName: 'A very long participant display name that should wrap cleanly',
          role: 'participant' as const,
          connected: false,
          hasVoted: true,
        },
      ],
    }

    renderModeratorRoute({ snapshot: snapshotWithParticipants })

    const list = screen.getByRole('list', { name: 'Joined participants' })
    const joinedParticipant = within(list).getByText('Maxi (2)').closest('li')
    const awayParticipant = within(list)
      .getByText('A very long participant display name that should wrap cleanly')
      .closest('li')

    expect(joinedParticipant).toBeInTheDocument()
    expect(awayParticipant).toBeInTheDocument()
    expect(within(joinedParticipant as HTMLElement).getByText('Joined')).toBeInTheDocument()
    expect(within(joinedParticipant as HTMLElement).getByText('Not voted')).toBeInTheDocument()
    expect(within(awayParticipant as HTMLElement).getByText('Away')).toBeInTheDocument()
    expect(within(awayParticipant as HTMLElement).getByText('Voted')).toBeInTheDocument()
    expect(within(list).queryByText('Maxi', { exact: true })).not.toBeInTheDocument()
  })

  it('does not render selected card values, tokens, or internal identity metadata', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      moderatorToken: 'moderator-token-should-stay-hidden',
      selectedCard: '13',
      participants: [
        snapshot.participants[0],
        {
          id: 'participant-hidden-id',
          displayName: 'Maxi (2)',
          role: 'participant' as const,
          connected: true,
          hasVoted: true,
          participantToken: 'participant-token-should-stay-hidden',
          selectedCard: '13',
          socketId: 'socket-hidden-id',
        },
      ],
    } as typeof snapshot

    renderModeratorRoute({ snapshot })

    expect(screen.getByText('Maxi (2)')).toBeInTheDocument()
    expect(screen.queryByText('13')).not.toBeInTheDocument()
    expect(screen.queryByText(/token-should-stay-hidden/i)).not.toBeInTheDocument()
    expect(screen.queryByText('participant-hidden-id')).not.toBeInTheDocument()
    expect(screen.queryByText('socket-hidden-id')).not.toBeInTheDocument()
  })

  it('prefers a newer latest snapshot over the route-state snapshot for the same room', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      participants: [
        snapshot.participants[0],
        {
          id: 'participant-latest',
          displayName: 'Latest Joiner',
          role: 'participant' as const,
          connected: true,
          hasVoted: false,
        },
      ],
      updatedAt: '2026-06-28T16:05:00.000Z',
    }

    renderModeratorRoute({
      snapshot: {
        ...snapshot,
        participants: [
          snapshot.participants[0],
          {
            id: 'participant-route',
            displayName: 'Route State Joiner',
            role: 'participant' as const,
            connected: true,
            hasVoted: false,
          },
        ],
      },
    })

    expect(screen.getByText('Latest Joiner')).toBeInTheDocument()
    expect(screen.queryByText('Route State Joiner')).not.toBeInTheDocument()
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
