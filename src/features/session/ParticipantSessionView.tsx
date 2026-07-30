import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ERROR_CODES } from '@shared/contracts/errors'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import { SessionSnapshotSchema } from '@shared/schemas/session-schemas'
import { VoteGroupList } from '../results/VoteGroupList'
import { readParticipantToken } from './session-storage'
import { useSessionSocket } from './useSessionSocket'

interface ParticipantRouteState {
  participantId?: unknown
  snapshot?: unknown
}

export function ParticipantSessionView() {
  const { roomCode = '' } = useParams()
  const location = useLocation()
  const sessionSocket = useSessionSocket()
  const [acceptedSnapshot, setAcceptedSnapshot] = useState<SessionSnapshot | null>(null)
  const [pendingVoteValue, setPendingVoteValue] = useState<string | null>(null)
  const [lastSubmittedValue, setLastSubmittedValue] = useState<string | null>(null)
  const [voteStatusMessage, setVoteStatusMessage] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const routeState = participantStateFromRouteState(location.state)
  const snapshot = selectSnapshot(
    roomCode,
    sessionSocket.latestSnapshot,
    acceptedSnapshot,
    routeState.snapshot,
  )
  const participant = snapshot?.participants.find(
    (candidate) => candidate.id === routeState.participantId && candidate.role === 'participant',
  )
  const participantToken =
    roomCode && participant ? readParticipantToken(roomCode, participant.id) : null
  const isAcceptedSnapshotVisible = snapshot === acceptedSnapshot
  const visibleLastSubmittedValue = participant?.hasVoted ? lastSubmittedValue : null
  const visibleVoteStatusMessage =
    participant?.hasVoted || isAcceptedSnapshotVisible ? voteStatusMessage : null

  if (!roomCode || !snapshot || !participant) {
    return (
      <main className="app-shell app-shell--session" aria-labelledby="missing-session-title">
        <section className="workspace">
          <Link className="back-link" to="/">
            Poker Planning
          </Link>
          <p className="eyebrow">Participant room</p>
          <h1 id="missing-session-title">Session details unavailable</h1>
          <p className="lead">Return to Poker Planning to join with a room code and display name.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell app-shell--session" aria-labelledby="participant-session-title">
      <section className="workspace participant-session">
        <Link className="back-link" to="/">
          Poker Planning
        </Link>
        <p className="eyebrow">Room</p>
        <h1 id="participant-session-title">Participant room</h1>
        <div className="room-code-panel" aria-label="Room code">
          <span className="room-code">{snapshot.roomCode}</span>
        </div>
        <section className="session-summary" aria-label="Participant session state">
          <div>
            <span>Your name</span>
            <strong>{participant.displayName}</strong>
          </div>
          <div>
            <span>Story ID</span>
            <strong>{snapshot.story?.id ?? 'No active story yet'}</strong>
          </div>
          <div>
            <span>Story description</span>
            <strong>{snapshot.story?.title ?? 'Waiting for the moderator to choose the first story.'}</strong>
          </div>
          <div>
            <span>Deck</span>
            <strong>{snapshot.deck.label}</strong>
          </div>
          <div>
            <span>Round</span>
            <strong>{roundStateLabel(snapshot.round.active, snapshot.round.revealed)}</strong>
          </div>
          <div>
            <span>Your vote</span>
            <strong>{participant.hasVoted ? 'Submitted' : 'Not submitted'}</strong>
          </div>
        </section>
        <section className="deck-options" aria-label="Deck options">
          <h2>{snapshot.deck.label} options</h2>
          <ul className="vote-card-grid">
            {snapshot.deck.values.map((value) => (
              <li key={value}>
                <button
                  aria-label={voteButtonLabel({
                    hasVoted: participant.hasVoted,
                    isAvailable: canSubmitVote(snapshot, participantToken),
                    isPending: pendingVoteValue === value,
                    value,
                  })}
                  aria-pressed={visibleLastSubmittedValue === value}
                  className="vote-card-button"
                  disabled={!canSubmitVote(snapshot, participantToken) || pendingVoteValue !== null}
                  onClick={() => void handleVoteSubmit(value)}
                  type="button"
                >
                  <span>{value}</span>
                  {visibleLastSubmittedValue === value ? <small>Selected</small> : null}
                </button>
              </li>
            ))}
          </ul>
          {visibleVoteStatusMessage ? <p className="vote-status">{visibleVoteStatusMessage}</p> : null}
          {voteError ? (
            <p className="form-error" role="alert">
              {voteError}
            </p>
          ) : null}
        </section>
        <VoteGroupList headingLevel={2} snapshot={snapshot} />
        {!snapshot.story ? (
          <section className="empty-state" aria-labelledby="participant-active-story-title">
            <h2 id="participant-active-story-title">No active story yet</h2>
            <p>Waiting for the moderator to choose the first story.</p>
          </section>
        ) : null}
      </section>
    </main>
  )

  async function handleVoteSubmit(value: string) {
    if (!snapshot || !participantToken || !participant || !canSubmitVote(snapshot, participantToken)) {
      return
    }

    const wasChangingVote = participant.hasVoted
    setPendingVoteValue(value)
    setVoteError(null)
    setVoteStatusMessage(null)

    const result = await sessionSocket.submitVote({
      roomCode,
      participantId: participant.id,
      participantToken,
      value,
    })

    setPendingVoteValue(null)

    if (!result.ok) {
      setVoteError(voteErrorMessageForCode(result.error.code))
      return
    }

    setAcceptedSnapshot(result.data)
    setLastSubmittedValue(value)
    setVoteStatusMessage(wasChangingVote ? 'Vote change submitted' : 'Vote submitted')
  }
}

function participantStateFromRouteState(state: unknown): {
  participantId: string | null
  snapshot: SessionSnapshot | null
} {
  const routeState = state as ParticipantRouteState | null
  const parsedSnapshot = SessionSnapshotSchema.safeParse(routeState?.snapshot)

  return {
    participantId: typeof routeState?.participantId === 'string' ? routeState.participantId : null,
    snapshot: parsedSnapshot.success ? parsedSnapshot.data : null,
  }
}

function selectSnapshot(
  roomCode: string,
  latestSnapshot: SessionSnapshot | null,
  acceptedSnapshot: SessionSnapshot | null,
  routeSnapshot: SessionSnapshot | null,
): SessionSnapshot | null {
  if (latestSnapshot?.roomCode === roomCode) {
    return newerSnapshot(latestSnapshot, acceptedSnapshot) ?? latestSnapshot
  }

  if (acceptedSnapshot?.roomCode === roomCode) {
    return acceptedSnapshot
  }

  if (routeSnapshot?.roomCode === roomCode) {
    return routeSnapshot
  }

  return null
}

function newerSnapshot(
  latestSnapshot: SessionSnapshot,
  acceptedSnapshot: SessionSnapshot | null,
): SessionSnapshot | null {
  if (acceptedSnapshot?.roomCode !== latestSnapshot.roomCode) {
    return latestSnapshot
  }

  return Date.parse(latestSnapshot.updatedAt) >= Date.parse(acceptedSnapshot.updatedAt)
    ? latestSnapshot
    : acceptedSnapshot
}

function roundStateLabel(active: boolean, revealed: boolean): string {
  if (revealed) {
    return 'Revealed'
  }

  if (active) {
    return 'Voting'
  }

  return 'Waiting'
}

function canSubmitVote(snapshot: SessionSnapshot, participantToken: string | null): boolean {
  return Boolean(participantToken && snapshot.round.active && !snapshot.round.revealed)
}

function voteButtonLabel({
  hasVoted,
  isAvailable,
  isPending,
  value,
}: {
  hasVoted: boolean
  isAvailable: boolean
  isPending: boolean
  value: string
}): string {
  if (isPending) {
    return `Submitting vote ${value}...`
  }

  if (!isAvailable) {
    return `Voting unavailable for ${value}`
  }

  return hasVoted ? `Change vote to ${value}` : `Submit vote ${value}`
}

function voteErrorMessageForCode(code: string): string {
  switch (code) {
    case ERROR_CODES.roundNotActive:
      return 'Voting is not active right now.'
    case ERROR_CODES.voteLocked:
      return 'Votes are locked for this round.'
    case ERROR_CODES.unauthorized:
      return 'Your participant session is not authorized to vote.'
    case ERROR_CODES.validationFailed:
      return 'That card is not available in the active deck.'
    default:
      return 'Vote could not be submitted. Please try again.'
  }
}
