import { fireEvent, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { createFailureAck, createSuccessAck } from '@shared/contracts/ack'
import { ERROR_CODES } from '@shared/contracts/errors'
import { PLANNING_DECKS } from '@shared/domain/decks'
import { ParticipantSessionView } from './ParticipantSessionView'
import { participantTokenStorageKey } from './session-storage'

const socketState = vi.hoisted(() => ({
  latestSnapshot: null as typeof snapshot | null,
  submitVote: vi.fn(),
}))

vi.mock('./useSessionSocket', () => ({
  useSessionSocket: () => ({
    connectionStatus: 'connected',
    createSession: vi.fn(),
    joinSession: vi.fn(),
    latestSnapshot: socketState.latestSnapshot,
    submitVote: socketState.submitVote,
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
  beforeEach(() => {
    window.sessionStorage.clear()
    socketState.latestSnapshot = null
    socketState.submitVote.mockReset()
    socketState.submitVote.mockResolvedValue(createSuccessAck(snapshot))
  })

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

  it('renders active deck values as keyboard-accessible vote buttons', () => {
    window.sessionStorage.setItem(
      participantTokenStorageKey('ABCD12', 'participant-2'),
      'participant-token-abcdefghijklmnopqrstuvwxyz',
    )

    renderParticipantRoute({
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
    })

    const voteButton = screen.getByRole('button', { name: 'Submit vote 8' })

    expect(voteButton).toBeEnabled()
    expect(voteButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('submits a token-backed vote command and shows submitted state from the server snapshot', async () => {
    window.sessionStorage.setItem(
      participantTokenStorageKey('ABCD12', 'participant-2'),
      'participant-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.submitVote.mockResolvedValue(
      createSuccessAck({
        ...snapshot,
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: true,
        },
        participants: snapshot.participants.map((participant) =>
          participant.id === 'participant-2' ? { ...participant, hasVoted: true } : participant,
        ),
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      }),
    )

    renderParticipantRoute({
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
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote 8' }))

    await waitFor(() => {
      expect(socketState.submitVote).toHaveBeenCalledWith({
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      })
    })
    expect(await screen.findByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('Vote submitted')).toBeInTheDocument()
    expect(screen.queryByText(/participant-token/i)).not.toBeInTheDocument()
  })

  it('clears local selected vote state when the server snapshot resets the participant vote', async () => {
    window.sessionStorage.setItem(
      participantTokenStorageKey('ABCD12', 'participant-2'),
      'participant-token-abcdefghijklmnopqrstuvwxyz',
    )
    const updatedAt = '2026-07-03T13:05:00.000Z'
    const activeSnapshot = {
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
    }
    socketState.submitVote.mockResolvedValue(
      createSuccessAck({
        ...activeSnapshot,
        updatedAt,
        participants: snapshot.participants.map((participant) =>
          participant.id === 'participant-2' ? { ...participant, hasVoted: true } : participant,
        ),
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      }),
    )

    const { rerender } = renderParticipantRoute({ snapshot: activeSnapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote 8' }))

    expect(await screen.findByText('Vote submitted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change vote to 8' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    socketState.latestSnapshot = {
      ...activeSnapshot,
      updatedAt,
    }
    rerender(buildParticipantRoute({ snapshot: activeSnapshot }))

    await waitFor(() => {
      expect(screen.queryByText('Vote submitted')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Submit vote 8' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByText('Selected')).not.toBeInTheDocument()
  })

  it('shows pending state and blocks overlapping vote commands', async () => {
    window.sessionStorage.setItem(
      participantTokenStorageKey('ABCD12', 'participant-2'),
      'participant-token-abcdefghijklmnopqrstuvwxyz',
    )
    let resolveAck: ((value: ReturnType<typeof createSuccessAck>) => void) | undefined
    socketState.submitVote.mockReturnValue(
      new Promise((resolve) => {
        resolveAck = resolve
      }),
    )

    renderParticipantRoute({
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
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote 8' }))

    expect(screen.getByRole('button', { name: 'Submitting vote 8...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Submit vote 5' })).toBeDisabled()
    resolveAck?.(createSuccessAck(snapshot) as never)
    await waitFor(() => {
      expect(socketState.submitVote).toHaveBeenCalled()
    })
  })

  it('lets participants change their selected vote before reveal', async () => {
    window.sessionStorage.setItem(
      participantTokenStorageKey('ABCD12', 'participant-2'),
      'participant-token-abcdefghijklmnopqrstuvwxyz',
    )

    renderParticipantRoute({
      snapshot: {
        ...snapshot,
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: true,
        },
        participants: snapshot.participants.map((participant) =>
          participant.id === 'participant-2' ? { ...participant, hasVoted: true } : participant,
        ),
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change vote to 5' }))

    await waitFor(() => {
      expect(socketState.submitVote).toHaveBeenCalledWith(
        expect.objectContaining({
          value: '5',
        }),
      )
    })
    expect(screen.getByText('Vote change submitted')).toBeInTheDocument()
  })

  it('keeps vote controls disabled when voting is unavailable', () => {
    renderParticipantRoute({ snapshot })

    expect(screen.getByRole('button', { name: 'Voting unavailable for 8' })).toBeDisabled()
  })

  it('keeps vote controls disabled when the participant token is missing', () => {
    renderParticipantRoute({
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
    })

    expect(screen.getByRole('button', { name: 'Voting unavailable for 8' })).toBeDisabled()
  })

  it('shows readable vote errors from stable server failures', async () => {
    window.sessionStorage.setItem(
      participantTokenStorageKey('ABCD12', 'participant-2'),
      'participant-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.submitVote.mockResolvedValue(
      createFailureAck({
        code: ERROR_CODES.roundNotActive,
        message: 'Voting is not active for this session.',
      }),
    )

    renderParticipantRoute({
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
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote 8' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Voting is not active right now.')
  })
})

function renderParticipantRoute(state?: unknown) {
  return render(buildParticipantRoute(state))
}

function buildParticipantRoute(state?: unknown) {
  return (
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/session/ABCD12',
          state: {
            participantId: 'participant-2',
            ...state,
          },
        },
      ]}
    >
      <Routes>
        <Route path="/session/:roomCode" element={<ParticipantSessionView />} />
      </Routes>
    </MemoryRouter>
  )
}
