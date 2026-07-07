import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/render'
import type { Ack } from '@shared/contracts/ack'
import { CLIENT_EVENTS, SERVER_EVENTS } from '@shared/contracts/socket-events'
import type { CreateSessionResult, JoinSessionResult } from '@shared/contracts/socket-events'
import { PLANNING_DECKS } from '@shared/domain/decks'
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

function ModeratorCommandHarness() {
  const {
    advanceStory,
    latestSnapshot,
    recordEstimate,
    resetRound,
    revealRound,
    selectDeck,
    startRound,
    updateStory,
  } =
    useSessionSocket()
  const [ack, setAck] = useState<Ack<{ roomCode: string }> | null>(null)

  async function handleStoryUpdate() {
    setAck(
      await updateStory({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      }),
    )
  }

  async function handleDeckSelect() {
    setAck(
      await selectDeck({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        deckId: 'tshirt',
      }),
    )
  }

  async function handleStartRound() {
    setAck(
      await startRound({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }),
    )
  }

  async function handleRevealRound() {
    setAck(
      await revealRound({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }),
    )
  }

  async function handleRecordEstimate() {
    setAck(
      await recordEstimate({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      }),
    )
  }

  async function handleResetRound() {
    setAck(
      await resetRound({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }),
    )
  }

  async function handleAdvanceStory() {
    setAck(
      await advanceStory({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }),
    )
  }

  return (
    <>
      <button onClick={handleStoryUpdate} type="button">
        Update story
      </button>
      <button onClick={handleDeckSelect} type="button">
        Select deck
      </button>
      <button onClick={handleStartRound} type="button">
        Start round
      </button>
      <button onClick={handleRevealRound} type="button">
        Reveal round
      </button>
      <button onClick={handleResetRound} type="button">
        Reset round
      </button>
      <button onClick={handleRecordEstimate} type="button">
        Record estimate
      </button>
      <button onClick={handleAdvanceStory} type="button">
        Advance story
      </button>
      <p data-testid="moderator-snapshot-story">{latestSnapshot?.story?.id ?? 'no story'}</p>
      <p data-testid="moderator-snapshot-deck">{latestSnapshot?.deck.label ?? 'no deck'}</p>
      <p data-testid="moderator-snapshot-round">
        {latestSnapshot?.round.active ? 'Voting' : 'Waiting'}
      </p>
      <p data-testid="moderator-snapshot-results">
        {latestSnapshot?.results?.votes.map((vote) => `${vote.displayName}:${vote.value}`).join(',') ??
          'no results'}
      </p>
      <p data-testid="moderator-snapshot-estimate">
        {latestSnapshot?.estimatedStories?.map((story) => story.finalEstimate).join(',') ??
          'no estimate'}
      </p>
      {ack && <p role="alert">{ack.ok ? 'ok' : ack.error.code}</p>}
    </>
  )
}

function VoteCommandHarness() {
  const { latestSnapshot, submitVote } = useSessionSocket()
  const [ack, setAck] = useState<Ack<{ roomCode: string }> | null>(null)

  async function handleSubmitVote() {
    setAck(
      await submitVote({
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      }),
    )
  }

  return (
    <>
      <button onClick={handleSubmitVote} type="button">
        Submit vote
      </button>
      <p data-testid="vote-snapshot-status">
        {latestSnapshot?.participants.find((participant) => participant.id === 'participant-2')
          ?.hasVoted
          ? 'Submitted'
          : 'Not submitted'}
      </p>
      {ack && <p role="alert">{ack.ok ? 'ok' : ack.error.code}</p>}
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

  it('uses the same acknowledgement timeout and schema validation for moderator story updates', async () => {
    socketMock.timeout.mockReturnValue({
      emit: vi.fn((_event, _command, callback) => {
        callback(null, {
          ok: true,
          data: {
            roomCode: 'ABCD12',
            deck: PLANNING_DECKS.fibonacci,
            story: {
              id: 'ADR-21',
              title: 'Estimate socket moderation flow',
              locked: false,
            },
            participants: [
              {
                id: 'moderator-1',
                displayName: 'Maxi',
                role: 'moderator',
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
        })
      }),
    })

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Update story' }))

    await screen.findByRole('alert')
    expect(socketMock.timeout).toHaveBeenCalledWith(5000)
    expect(screen.getByRole('alert')).toHaveTextContent('ok')
    expect(screen.getByTestId('moderator-snapshot-story')).toHaveTextContent('ADR-21')
  })

  it('applies successful moderator deck acknowledgements to the local snapshot state', async () => {
    socketMock.timeout.mockReturnValue({
      emit: vi.fn((_event, _command, callback) => {
        callback(null, {
          ok: true,
          data: {
            roomCode: 'ABCD12',
            deck: PLANNING_DECKS.tshirt,
            story: {
              id: 'ADR-21',
              title: 'Estimate socket moderation flow',
              locked: false,
            },
            participants: [
              {
                id: 'moderator-1',
                displayName: 'Maxi',
                role: 'moderator',
                connected: true,
                hasVoted: false,
              },
            ],
            round: {
              active: false,
              revealed: false,
              voteCount: 0,
            },
            updatedAt: '2026-07-02T12:01:00.000Z',
          },
        })
      }),
    })

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Select deck' }))

    await screen.findByRole('alert')
    expect(screen.getByTestId('moderator-snapshot-deck')).toHaveTextContent('T-shirt')
  })

  it('returns a stable failure when a moderator command acknowledgement is malformed', async () => {
    socketMock.timeout.mockReturnValue({
      emit: vi.fn((_event, _command, callback) => {
        callback(null, {
          ok: true,
          data: {
            roomCode: 'ABCD12',
            deck: {
              id: 'not-a-real-deck',
              label: 'Broken',
              values: [],
            },
          },
        })
      }),
    })

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Select deck' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
  })

  it('applies successful start-round acknowledgements to the local snapshot state', async () => {
    socketMock.timeout.mockReturnValue({
      emit: vi.fn((_event, _command, callback) => {
        callback(null, {
          ok: true,
          data: {
            roomCode: 'ABCD12',
            deck: PLANNING_DECKS.fibonacci,
            story: {
              id: 'ADR-21',
              title: 'Estimate socket moderation flow',
              locked: true,
            },
            participants: [
              {
                id: 'moderator-1',
                displayName: 'Maxi',
                role: 'moderator',
                connected: true,
                hasVoted: false,
              },
            ],
            round: {
              active: true,
              revealed: false,
              voteCount: 0,
            },
            updatedAt: '2026-07-02T12:02:00.000Z',
          },
        })
      }),
    })

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Start round' }))

    await screen.findByRole('alert')
    expect(socketMock.timeout).toHaveBeenCalledWith(5000)
    expect(screen.getByRole('alert')).toHaveTextContent('ok')
    expect(screen.getByTestId('moderator-snapshot-round')).toHaveTextContent('Voting')
  })

  it('uses the shared timeout fallback for start-round commands', async () => {
    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Start round' }))

    await waitFor(() => {
      expect(socketMock.timeout).toHaveBeenCalledWith(5000)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
  })

  it('emits reveal commands, validates successful acknowledgements, and updates the local snapshot', async () => {
    const emit = vi.fn((_event, _command, callback) => {
      callback(null, {
        ok: true,
        data: {
          roomCode: 'ABCD12',
          deck: PLANNING_DECKS.fibonacci,
          story: {
            id: 'ADR-21',
            title: 'Estimate socket moderation flow',
            locked: true,
          },
          participants: [
            {
              id: 'participant-2',
              displayName: 'Ana',
              role: 'participant',
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
          updatedAt: '2026-07-03T13:30:00.000Z',
        },
      })
    })
    socketMock.timeout.mockReturnValue({ emit })

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal round' }))

    await screen.findByRole('alert')
    expect(emit).toHaveBeenCalledWith(
      CLIENT_EVENTS.roundReveal,
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      expect.any(Function),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('ok')
    expect(screen.getByTestId('moderator-snapshot-results')).toHaveTextContent('Ana:8')
  })

  it('returns a stable failure when a reveal acknowledgement is malformed or unavailable', async () => {
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

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal round' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
  })

  it('emits final estimate commands and applies successful acknowledgements', async () => {
    const emit = vi.fn((_event, _command, callback) => {
      callback(null, {
        ok: true,
        data: {
          roomCode: 'ABCD12',
          deck: PLANNING_DECKS.fibonacci,
          story: {
            id: 'ADR-21',
            title: 'Estimate socket moderation flow',
            locked: true,
          },
          participants: [
            {
              id: 'moderator-1',
              displayName: 'Maxi',
              role: 'moderator',
              connected: true,
              hasVoted: false,
            },
          ],
          round: {
            active: true,
            revealed: true,
            voteCount: 0,
          },
          results: {
            votes: [],
          },
          estimatedStories: [
            {
              storyId: 'ADR-21',
              title: 'Estimate socket moderation flow',
              deck: PLANNING_DECKS.fibonacci,
              finalEstimate: '8',
            },
          ],
          updatedAt: '2026-07-04T10:00:00.000Z',
        },
      })
    })
    socketMock.timeout.mockReturnValue({ emit })

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Record estimate' }))

    await screen.findByRole('alert')
    expect(emit).toHaveBeenCalledWith(
      CLIENT_EVENTS.estimateRecord,
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      expect.any(Function),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('ok')
    expect(screen.getByTestId('moderator-snapshot-estimate')).toHaveTextContent('8')
  })

  it('emits reset commands and applies successful acknowledgements', async () => {
    const emit = vi.fn((_event, _command, callback) => {
      callback(null, {
        ok: true,
        data: {
          roomCode: 'ABCD12',
          deck: PLANNING_DECKS.fibonacci,
          story: {
            id: 'ADR-21',
            title: 'Estimate socket moderation flow',
            locked: false,
          },
          participants: [
            {
              id: 'moderator-1',
              displayName: 'Maxi',
              role: 'moderator',
              connected: true,
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
        },
      })
    })
    socketMock.timeout.mockReturnValue({ emit })

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset round' }))

    await screen.findByRole('alert')
    expect(emit).toHaveBeenCalledWith(
      CLIENT_EVENTS.roundReset,
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      expect.any(Function),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('ok')
    expect(screen.getByTestId('moderator-snapshot-round')).toHaveTextContent('Waiting')
  })

  it('emits advance commands and applies successful acknowledgements', async () => {
    const emit = vi.fn((_event, _command, callback) => {
      callback(null, {
        ok: true,
        data: {
          roomCode: 'ABCD12',
          deck: PLANNING_DECKS.fibonacci,
          story: null,
          participants: [
            {
              id: 'moderator-1',
              displayName: 'Maxi',
              role: 'moderator',
              connected: true,
              hasVoted: false,
            },
          ],
          round: {
            active: false,
            revealed: false,
            voteCount: 0,
          },
          results: null,
          estimatedStories: [
            {
              storyId: 'ADR-21',
              title: 'Estimate socket moderation flow',
              deck: PLANNING_DECKS.fibonacci,
              finalEstimate: '8',
            },
          ],
          updatedAt: '2026-07-05T10:05:00.000Z',
        },
      })
    })
    socketMock.timeout.mockReturnValue({ emit })

    renderWithSocketProvider(<ModeratorCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Advance story' }))

    await screen.findByRole('alert')
    expect(emit).toHaveBeenCalledWith(
      CLIENT_EVENTS.storyAdvance,
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      expect.any(Function),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('ok')
    expect(screen.getByTestId('moderator-snapshot-story')).toHaveTextContent('no story')
  })

  it('applies successful vote acknowledgements to the local snapshot state', async () => {
    socketMock.timeout.mockReturnValue({
      emit: vi.fn((_event, _command, callback) => {
        callback(null, {
          ok: true,
          data: {
            roomCode: 'ABCD12',
            deck: PLANNING_DECKS.fibonacci,
            story: {
              id: 'ADR-21',
              title: 'Estimate socket moderation flow',
              locked: true,
            },
            participants: [
              {
                id: 'participant-2',
                displayName: 'Ana',
                role: 'participant',
                connected: true,
                hasVoted: true,
              },
            ],
            round: {
              active: true,
              revealed: false,
              voteCount: 1,
            },
            updatedAt: '2026-07-03T13:00:00.000Z',
          },
        })
      }),
    })

    renderWithSocketProvider(<VoteCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote' }))

    await screen.findByRole('alert')
    expect(socketMock.timeout).toHaveBeenCalledWith(5000)
    expect(screen.getByRole('alert')).toHaveTextContent('ok')
    expect(screen.getByTestId('vote-snapshot-status')).toHaveTextContent('Submitted')
  })

  it('returns a stable failure when a vote acknowledgement is malformed', async () => {
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

    renderWithSocketProvider(<VoteCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
  })

  it('uses the shared timeout fallback for vote commands', async () => {
    renderWithSocketProvider(<VoteCommandHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote' }))

    await waitFor(() => {
      expect(socketMock.timeout).toHaveBeenCalledWith(5000)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('CONNECTION_UNAVAILABLE')
  })
})
