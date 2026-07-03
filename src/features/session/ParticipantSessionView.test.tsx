import { screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { PLANNING_DECKS } from '@shared/domain/decks'
import { ParticipantSessionView } from './ParticipantSessionView'

vi.mock('./useSessionSocket', () => ({
  useSessionSocket: () => ({
    connectionStatus: 'connected',
    createSession: vi.fn(),
    joinSession: vi.fn(),
    latestSnapshot: null,
  }),
}))

const snapshot = {
  roomCode: 'ABCD12',
  deck: PLANNING_DECKS.fibonacci,
  story: null,
  participants: [
    {
      id: 'moderator-1',
      displayName: 'Maxi',
      role: 'moderator' as const,
      connected: true,
      hasVoted: false,
    },
    {
      id: 'participant-2',
      displayName: 'Ana',
      role: 'participant' as const,
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
}

describe('ParticipantSessionView', () => {
  it('renders participant-visible session state and hides moderator-only controls', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/session/ABCD12',
            state: {
              participantId: 'participant-2',
              snapshot,
            },
          },
        ]}
      >
        <Routes>
          <Route path="/session/:roomCode" element={<ParticipantSessionView />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Participant room' })).toBeInTheDocument()
    expect(screen.getByText('ABCD12')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Fibonacci')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fibonacci options' })).toBeInTheDocument()
    expect(screen.getByText('Coffee')).toBeInTheDocument()
    expect(screen.getByText('Waiting')).toBeInTheDocument()
    expect(screen.getByText('Not submitted')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No active story yet' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy room code/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/moderator token/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/final estimate/i)).not.toBeInTheDocument()
  })

  it('renders the shared story identifier and description without exposing edit controls', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/session/ABCD12',
            state: {
              participantId: 'participant-2',
              snapshot: {
                ...snapshot,
                story: {
                  id: 'ADR-21',
                  title: 'Estimate socket moderation flow',
                  locked: false,
                },
              },
            },
          },
        ]}
      >
        <Routes>
          <Route path="/session/:roomCode" element={<ParticipantSessionView />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('ADR-21')).toBeInTheDocument()
    expect(screen.getByText('Estimate socket moderation flow')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save story' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'T-shirt' })).not.toBeInTheDocument()
  })

  it('shows active voting state from the server snapshot without moderator controls', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/session/ABCD12',
            state: {
              participantId: 'participant-2',
              snapshot: {
                ...snapshot,
                story: {
                  id: 'ADR-21',
                  title: 'Estimate socket moderation flow',
                  locked: true,
                },
                round: {
                  active: true,
                  revealed: false,
                  voteCount: 0,
                },
              },
            },
          },
        ]}
      >
        <Routes>
          <Route path="/session/:roomCode" element={<ParticipantSessionView />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Voting')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start round' })).not.toBeInTheDocument()
    expect(screen.queryByText(/moderator-token/i)).not.toBeInTheDocument()
  })
})
