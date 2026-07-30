import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import { createFailureAck, createSuccessAck } from '@shared/contracts/ack'
import { ERROR_CODES } from '@shared/contracts/errors'
import { PLANNING_DECKS } from '@shared/domain/decks'
import { ModeratorSessionView } from './ModeratorSessionView'
import { moderatorTokenStorageKey } from './session-storage'

const socketState = vi.hoisted(() => ({
  latestSnapshot: null as typeof snapshot | null,
  updateStory: vi.fn(),
  selectDeck: vi.fn(),
  startRound: vi.fn(),
  submitVote: vi.fn(),
  revealRound: vi.fn(),
  recordEstimate: vi.fn(),
  resetRound: vi.fn(),
  advanceStory: vi.fn(),
}))

vi.mock('./useSessionSocket', () => ({
  useSessionSocket: () => ({
    connectionStatus: 'connected',
    createSession: vi.fn(),
    latestSnapshot: socketState.latestSnapshot,
    resetRound: socketState.resetRound,
    revealRound: socketState.revealRound,
    recordEstimate: socketState.recordEstimate,
    selectDeck: socketState.selectDeck,
    startRound: socketState.startRound,
    submitVote: socketState.submitVote,
    updateStory: socketState.updateStory,
    advanceStory: socketState.advanceStory,
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

function moderatorRouteElement(state?: unknown) {
  return (
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
    </MemoryRouter>
  )
}

function renderModeratorRoute(state?: unknown) {
  return render(moderatorRouteElement(state))
}

describe('ModeratorSessionView', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    socketState.latestSnapshot = null
    socketState.updateStory.mockReset()
    socketState.selectDeck.mockReset()
    socketState.startRound.mockReset()
    socketState.submitVote.mockReset()
    socketState.revealRound.mockReset()
    socketState.recordEstimate.mockReset()
    socketState.resetRound.mockReset()
    socketState.advanceStory.mockReset()
    socketState.updateStory.mockResolvedValue(createSuccessAck(snapshot))
    socketState.selectDeck.mockResolvedValue(createSuccessAck(snapshot))
    socketState.startRound.mockResolvedValue(createSuccessAck(snapshot))
    socketState.submitVote.mockResolvedValue(createSuccessAck(snapshot))
    socketState.revealRound.mockResolvedValue(createSuccessAck(snapshot))
    socketState.recordEstimate.mockResolvedValue(createSuccessAck(snapshot))
    socketState.resetRound.mockResolvedValue(createSuccessAck(snapshot))
    socketState.advanceStory.mockResolvedValue(createSuccessAck(snapshot))
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
    expect(screen.getByRole('heading', { name: 'Estimated stories' })).toBeInTheDocument()
    expect(screen.getByText('No estimates recorded yet.')).toBeInTheDocument()
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

  it('updates the presence list when a newer live snapshot arrives', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    const rendered = renderModeratorRoute({ snapshot })

    expect(screen.getByText('No participants have joined yet.')).toBeInTheDocument()

    socketState.latestSnapshot = {
      ...snapshot,
      participants: [
        snapshot.participants[0],
        {
          id: 'participant-live',
          displayName: 'Live Joiner',
          role: 'participant' as const,
          connected: true,
          hasVoted: false,
        },
      ],
      updatedAt: '2026-06-28T16:05:00.000Z',
    }
    rendered.rerender(moderatorRouteElement({ snapshot }))

    expect(screen.getByText('Live Joiner')).toBeInTheDocument()
    expect(screen.queryByText('No participants have joined yet.')).not.toBeInTheDocument()
  })

  it('does not render tokens or internal identity metadata', () => {
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

  it('renders moderator story controls and submits token-backed story updates', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-20',
        title: 'Existing story',
        locked: false,
      },
    }

    renderModeratorRoute({ snapshot })
    fireEvent.change(screen.getByLabelText('Story identifier'), { target: { value: 'ADR-21' } })
    fireEvent.change(screen.getByLabelText('Brief description'), {
      target: { value: 'Estimate socket moderation flow' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save story' }))

    await waitFor(() => {
      expect(socketState.updateStory).toHaveBeenCalledWith({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      })
    })

    expect(screen.getByLabelText('Story identifier')).toHaveAttribute('maxLength', '120')
  })

  it('shows the active deck values to the moderator', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )

    renderModeratorRoute({ snapshot })

    expect(screen.getByRole('heading', { name: 'Fibonacci options' })).toBeInTheDocument()
    expect(screen.getByText('Coffee')).toBeInTheDocument()
  })

  it('shows pending and error states for moderator deck changes and blocks overlapping story edits', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    let resolveAck: ((value: ReturnType<typeof createSuccessAck>) => void) | undefined
    socketState.selectDeck.mockReturnValue(
      new Promise((resolve) => {
        resolveAck = resolve
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'T-shirt' }))

    expect(screen.getByRole('button', { name: 'Switching to T-shirt...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save story' })).toBeDisabled()
    expect(screen.getByLabelText('Story identifier')).toBeDisabled()
    resolveAck?.(createFailureAck({
      code: ERROR_CODES.storyLocked,
      message: 'The current story and deck cannot change during an active round.',
    }) as never)

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Story and deck changes are locked while a round is active.',
    )
  })

  it('blocks deck changes while a story save is pending', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    let resolveAck: ((value: ReturnType<typeof createSuccessAck>) => void) | undefined
    socketState.updateStory.mockReturnValue(
      new Promise((resolve) => {
        resolveAck = resolve
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.change(screen.getByLabelText('Story identifier'), { target: { value: 'ADR-21' } })
    fireEvent.change(screen.getByLabelText('Brief description'), {
      target: { value: 'Estimate socket moderation flow' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save story' }))

    expect(screen.getByRole('button', { name: 'T-shirt' })).toBeDisabled()
    resolveAck?.(createSuccessAck(snapshot) as never)
    await waitFor(() => {
      expect(socketState.updateStory).toHaveBeenCalled()
    })
  })

  it('starts a round with the stored moderator token when a story exists', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: false,
      },
    }

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Start round' }))

    await waitFor(() => {
      expect(socketState.startRound).toHaveBeenCalledWith({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      })
    })
    expect(screen.queryByText(/moderator-token/i)).not.toBeInTheDocument()
  })

  it('disables start round when no story exists or a round is already active', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )

    renderModeratorRoute({ snapshot })
    expect(screen.getByRole('button', { name: 'Start round' })).toBeDisabled()
  })

  it('shows start-round pending state without optimistic active-round rendering', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: false,
      },
    }
    let resolveAck: ((value: ReturnType<typeof createSuccessAck>) => void) | undefined
    socketState.startRound.mockReturnValue(
      new Promise((resolve) => {
        resolveAck = resolve
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Start round' }))

    expect(screen.getByRole('button', { name: 'Starting round...' })).toBeDisabled()
    expect(screen.getByText('Story and deck are ready to edit.')).toBeInTheDocument()
    expect(screen.queryByText('Story and deck are locked during an active round.')).not.toBeInTheDocument()
    resolveAck?.(createSuccessAck(snapshot) as never)
    await waitFor(() => {
      expect(socketState.startRound).toHaveBeenCalled()
    })
  })

  it('shows readable start-round errors for server failures', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: false,
      },
    }
    socketState.startRound.mockResolvedValue(
      createFailureAck({
        code: ERROR_CODES.storyRequired,
        message: 'Choose a current story before starting a voting round.',
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Start round' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose a current story before starting a voting round.',
    )
  })

  it('shows active voting state and disables the start control when the server snapshot is active', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
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

    renderModeratorRoute({ snapshot })

    expect(screen.getByRole('button', { name: 'Round active' })).toBeDisabled()
    expect(screen.getByText('Story and deck are locked during an active round.')).toBeInTheDocument()
  })

  it('renders active deck cards for moderator voting during an unrevealed round', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
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

    renderModeratorRoute({ snapshot })

    expect(screen.getByRole('group', { name: 'Moderator vote cards' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit moderator vote 8' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('submits moderator votes with the stored moderator token and does not render the token', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
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
        ...socketState.latestSnapshot,
        updatedAt: '2026-07-03T13:05:00.000Z',
        participants: [
          {
            ...snapshot.participants[0],
            hasVoted: true,
          },
        ],
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Submit moderator vote 8' }))

    await waitFor(() => {
      expect(socketState.submitVote).toHaveBeenCalledWith({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      })
    })
    expect(await screen.findByText('Vote submitted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change moderator vote to 8' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByText(/moderator-token/i)).not.toBeInTheDocument()
  })

  it('clears local moderator selected state when an equal-timestamp socket snapshot resets the vote', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
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
    socketState.latestSnapshot = activeSnapshot
    socketState.submitVote.mockResolvedValue(
      createSuccessAck({
        ...activeSnapshot,
        updatedAt,
        participants: snapshot.participants.map((participant) => ({
          ...participant,
          hasVoted: true,
        })),
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      }),
    )

    const { rerender } = renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Submit moderator vote 8' }))

    expect(await screen.findByText('Vote submitted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change moderator vote to 8' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    socketState.latestSnapshot = {
      ...activeSnapshot,
      updatedAt,
    }
    rerender(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/session/ABCD12/moderator',
            state: { snapshot },
          },
        ]}
      >
        <Routes>
          <Route path="/session/:roomCode/moderator" element={<ModeratorSessionView />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByText('Vote submitted')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Submit moderator vote 8' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByText('Selected')).not.toBeInTheDocument()
  })

  it('shows pending state without marking the moderator voted before acknowledgement', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
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
    let resolveAck: ((value: ReturnType<typeof createSuccessAck>) => void) | undefined
    socketState.submitVote.mockReturnValue(
      new Promise((resolve) => {
        resolveAck = resolve
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Submit moderator vote 13' }))

    expect(screen.getByRole('button', { name: 'Submitting moderator vote 13...' })).toBeDisabled()
    expect(screen.queryByText('Vote submitted')).not.toBeInTheDocument()
    resolveAck?.(createSuccessAck(socketState.latestSnapshot) as never)

    await waitFor(() => {
      expect(socketState.submitVote).toHaveBeenCalled()
    })
  })

  it('submits changed moderator votes and shows readable failures', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      participants: [
        {
          ...snapshot.participants[0],
          hasVoted: true,
        },
      ],
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      round: {
        active: true,
        revealed: false,
        voteCount: 1,
      },
    }
    socketState.submitVote
      .mockResolvedValueOnce(createSuccessAck(socketState.latestSnapshot))
      .mockResolvedValueOnce(
        createFailureAck({
          code: ERROR_CODES.voteLocked,
          message: 'Votes are locked for this round.',
        }),
      )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Change moderator vote to 5' }))

    await screen.findByText('Vote change submitted')
    fireEvent.click(screen.getByRole('button', { name: 'Change moderator vote to 8' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('Votes are locked for this round.')
  })

  it('keeps moderator vote controls disabled when the token is unavailable', () => {
    socketState.latestSnapshot = {
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

    renderModeratorRoute({ snapshot })

    expect(screen.getByRole('button', { name: 'Voting unavailable for moderator card 8' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save story' })).toBeDisabled()
  })

  it('shows moderator reveal controls only during an active unrevealed round and waits for ack', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      participants: [
        snapshot.participants[0],
        {
          id: 'participant-2',
          displayName: 'Ana',
          role: 'participant' as const,
          connected: true,
          hasVoted: true,
        },
      ],
      round: {
        active: true,
        revealed: false,
        voteCount: 1,
      },
    }
    let resolveAck: ((value: ReturnType<typeof createSuccessAck>) => void) | undefined
    socketState.revealRound.mockReturnValue(
      new Promise((resolve) => {
        resolveAck = resolve
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Reveal results' }))

    expect(screen.getByRole('button', { name: 'Revealing results...' })).toBeDisabled()
    expect(screen.queryByLabelText('Majority: 1 vote for 8 by Ana')).not.toBeInTheDocument()
    resolveAck?.(
      createSuccessAck({
        ...socketState.latestSnapshot,
        round: {
          active: true,
          revealed: true,
          voteCount: 1,
        },
        results: {
          votes: [
            {
              participantId: 'participant-2',
              displayName: 'Ana',
              role: 'participant',
              value: '8',
            },
          ],
        },
        updatedAt: '2026-07-03T13:30:00.000Z',
      }) as never,
    )

    await waitFor(() => {
      expect(socketState.revealRound).toHaveBeenCalledWith({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      })
    })
    expect(await screen.findByLabelText('Majority: 1 vote for 8 by Ana')).toBeInTheDocument()
  })

  it('shows readable reveal errors and renders non-voters in presence without card values', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      participants: [
        snapshot.participants[0],
        {
          id: 'participant-2',
          displayName: 'Ana',
          role: 'participant' as const,
          connected: true,
          hasVoted: false,
        },
      ],
      round: {
        active: true,
        revealed: false,
        voteCount: 0,
      },
    }
    socketState.revealRound.mockResolvedValue(
      createFailureAck({
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can reveal round results.',
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Reveal results' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only the moderator can reveal results.')
    const row = screen
      .getByRole('list', { name: 'Joined participants' })
      .querySelector('li') as HTMLElement
    expect(row).toHaveTextContent('Ana')
    expect(row).toHaveTextContent('Not voted')
    expect(row).not.toHaveTextContent('8')
  })

  it('shows reset control during active or revealed rounds and waits for the server snapshot', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      participants: [
        {
          ...snapshot.participants[0],
          hasVoted: true,
        },
      ],
      round: {
        active: true,
        revealed: true,
        voteCount: 1,
      },
      results: {
        votes: [
          {
            participantId: 'participant-1',
            displayName: 'Maxi',
            role: 'moderator' as const,
            value: '8',
          },
        ],
      },
    }
    let resolveAck: ((value: ReturnType<typeof createSuccessAck>) => void) | undefined
    socketState.resetRound.mockReturnValue(
      new Promise((resolve) => {
        resolveAck = resolve
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Reset round' }))

    expect(screen.getByRole('button', { name: 'Resetting round...' })).toBeDisabled()
    expect(screen.getByLabelText('Majority: 1 vote for 8 by Maxi')).toBeInTheDocument()
    resolveAck?.(
      createSuccessAck({
        ...socketState.latestSnapshot,
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: false,
        },
        participants: [
          {
            ...snapshot.participants[0],
            hasVoted: false,
          },
        ],
        round: {
          active: false,
          revealed: false,
          voteCount: 0,
        },
        results: null,
        updatedAt: '2026-07-05T10:00:00.000Z',
      }) as never,
    )

    await waitFor(() => {
      expect(socketState.resetRound).toHaveBeenCalledWith({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      })
    })
    expect(screen.queryByLabelText('Majority: 1 vote for 8 by Maxi')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Final estimate' })).not.toBeInTheDocument()
  })

  it('renders grouped revealed vote results and hides reveal controls once revealed', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      participants: [
        snapshot.participants[0],
        {
          id: 'participant-2',
          displayName: 'Ana',
          role: 'participant' as const,
          connected: true,
          hasVoted: true,
        },
      ],
      round: {
        active: true,
        revealed: true,
        voteCount: 1,
      },
      results: {
        votes: [
          {
            participantId: 'participant-2',
            displayName: 'Ana',
            role: 'participant',
            value: '8',
          },
        ],
      },
    }

    renderModeratorRoute({ snapshot })

    expect(screen.queryByRole('button', { name: 'Reveal results' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Majority: 1 vote for 8 by Ana')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Final estimate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record final estimate 8' })).toBeInTheDocument()
  })

  it('records a final estimate only after a successful server acknowledgement', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    const revealedSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      round: {
        active: true,
        revealed: true,
        voteCount: 0,
      },
      results: {
        votes: [],
      },
    }
    const acknowledgedSnapshot = {
      ...revealedSnapshot,
      currentStoryHasFinalEstimate: true,
      estimatedStories: [
        {
          storyId: 'ADR-21',
          title: 'Estimate socket moderation flow',
          deck: PLANNING_DECKS.fibonacci,
          finalEstimate: '8',
        },
      ],
      updatedAt: '2026-07-04T10:00:00.000Z',
    }
    socketState.latestSnapshot = revealedSnapshot
    socketState.recordEstimate.mockResolvedValue(createSuccessAck(acknowledgedSnapshot))

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Record final estimate 8' }))

    expect(screen.queryByText('Recorded estimate: 8')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(socketState.recordEstimate).toHaveBeenCalledWith({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      })
    })
    expect(await screen.findByText('Recorded estimate: 8')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recorded final estimate 8' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const estimatedStoriesList = screen.getByRole('list', { name: 'Estimated stories list' })
    expect(within(estimatedStoriesList).getByText('ADR-21')).toBeInTheDocument()
    expect(within(estimatedStoriesList).getByText('Estimate socket moderation flow')).toBeInTheDocument()
    expect(within(estimatedStoriesList).getByText('Fibonacci')).toBeInTheDocument()
    expect(within(estimatedStoriesList).getByText('8')).toBeInTheDocument()
  })

  it('disables final estimate controls while the command is pending', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      round: {
        active: true,
        revealed: true,
        voteCount: 0,
      },
      results: {
        votes: [],
      },
    }
    let resolveAck: (value: ReturnType<typeof createSuccessAck>) => void = () => undefined
    socketState.recordEstimate.mockReturnValue(
      new Promise((resolve) => {
        resolveAck = resolve
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Record final estimate 5' }))

    expect(screen.getByRole('button', { name: 'Recording final estimate 5...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Record final estimate 8' })).toBeDisabled()

    resolveAck(createSuccessAck(socketState.latestSnapshot))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Record final estimate 5' })).not.toBeDisabled()
    })
  })

  it('maps final estimate command failures to readable messages', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      round: {
        active: true,
        revealed: true,
        voteCount: 0,
      },
      results: {
        votes: [],
      },
    }
    socketState.recordEstimate.mockResolvedValue(
      createFailureAck({
        code: ERROR_CODES.validationFailed,
        message: 'Final estimate must be one of the active deck cards.',
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Record final estimate 8' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a final estimate from the active deck.',
    )
  })

  it('shows advance control only when a final estimate exists and clears the active story after success', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      round: {
        active: true,
        revealed: true,
        voteCount: 1,
      },
      results: {
        votes: [
          {
            participantId: 'participant-1',
            displayName: 'Maxi',
            role: 'moderator' as const,
            value: '8',
          },
        ],
      },
      currentStoryHasFinalEstimate: true,
      estimatedStories: [
        {
          storyId: 'ADR-21',
          title: 'Estimate socket moderation flow',
          deck: PLANNING_DECKS.fibonacci,
          finalEstimate: '8',
        },
      ],
    }
    socketState.advanceStory.mockResolvedValue(
      createSuccessAck({
        ...socketState.latestSnapshot,
        story: null,
        round: {
          active: false,
          revealed: false,
          voteCount: 0,
        },
        results: null,
        updatedAt: '2026-07-05T10:05:00.000Z',
      }),
    )

    renderModeratorRoute({ snapshot })
    fireEvent.click(screen.getByRole('button', { name: 'Advance to next story' }))

    await waitFor(() => {
      expect(socketState.advanceStory).toHaveBeenCalledWith({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      })
    })
    expect(await screen.findByText('No active story yet')).toBeInTheDocument()
    expect(screen.getByText('Deck: Fibonacci')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Estimated stories list' })).toBeInTheDocument()
    expect(screen.getByText('ADR-21')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Advance to next story' })).not.toBeInTheDocument()
  })

  it('renders multiple estimated stories for the moderator from snapshot state', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-55',
        title: 'Current story still in progress',
        locked: false,
      },
      estimatedStories: [
        {
          storyId: 'ADR-21',
          title: 'Estimate socket moderation flow',
          deck: PLANNING_DECKS.fibonacci,
          finalEstimate: '8',
        },
        {
          storyId: 'ADR-34',
          title: 'Advance to the next story',
          deck: PLANNING_DECKS.tshirt,
          finalEstimate: 'L',
        },
      ],
    }

    renderModeratorRoute({ snapshot })

    const list = screen.getByRole('list', { name: 'Estimated stories list' })
    const items = within(list).getAllByRole('listitem')

    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('ADR-21')).toBeInTheDocument()
    expect(within(items[1]).getByText('ADR-34')).toBeInTheDocument()
    expect(within(items[1]).getByText('T-shirt')).toBeInTheDocument()
  })

  it('keeps advance disabled until the current story has a recorded final estimate', async () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      round: {
        active: true,
        revealed: true,
        voteCount: 1,
      },
      results: {
        votes: [],
      },
      estimatedStories: [],
    }
    renderModeratorRoute({ snapshot })
    expect(screen.getByRole('button', { name: 'Advance to next story' })).toBeDisabled()
  })

  it('does not treat a historical estimate as a fresh estimate after reset', () => {
    window.sessionStorage.setItem(
      moderatorTokenStorageKey('ABCD12'),
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    socketState.latestSnapshot = {
      ...snapshot,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      round: {
        active: true,
        revealed: true,
        voteCount: 1,
      },
      results: {
        votes: [],
      },
      currentStoryHasFinalEstimate: false,
      estimatedStories: [
        {
          storyId: 'ADR-21',
          title: 'Estimate socket moderation flow',
          deck: PLANNING_DECKS.fibonacci,
          finalEstimate: '8',
        },
      ],
    }

    renderModeratorRoute({ snapshot })

    expect(screen.queryByText('Recorded estimate: 8')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Advance to next story' })).toBeDisabled()
  })
})
