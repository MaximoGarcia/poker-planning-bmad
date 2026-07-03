import { Link, useLocation, useParams } from 'react-router-dom'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import { SessionSnapshotSchema } from '@shared/schemas/session-schemas'
import { useSessionSocket } from './useSessionSocket'

interface ParticipantRouteState {
  participantId?: unknown
  snapshot?: unknown
}

export function ParticipantSessionView() {
  const { roomCode = '' } = useParams()
  const location = useLocation()
  const { latestSnapshot } = useSessionSocket()
  const routeState = participantStateFromRouteState(location.state)
  const snapshot = selectSnapshot(roomCode, latestSnapshot, routeState.snapshot)
  const participant = snapshot?.participants.find(
    (candidate) => candidate.id === routeState.participantId && candidate.role === 'participant',
  )

  if (!roomCode || !snapshot || !participant) {
    return (
      <main className="app-shell app-shell--session" aria-labelledby="missing-session-title">
        <section className="workspace">
          <Link className="back-link" to="/">
            ADR Buddy
          </Link>
          <p className="eyebrow">Participant room</p>
          <h1 id="missing-session-title">Session details unavailable</h1>
          <p className="lead">Return to ADR Buddy to join with a room code and display name.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell app-shell--session" aria-labelledby="participant-session-title">
      <section className="workspace participant-session">
        <Link className="back-link" to="/">
          ADR Buddy
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
          <ul>
            {snapshot.deck.values.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </section>
        {!snapshot.story ? (
          <section className="empty-state" aria-labelledby="participant-active-story-title">
            <h2 id="participant-active-story-title">No active story yet</h2>
            <p>Waiting for the moderator to choose the first story.</p>
          </section>
        ) : null}
      </section>
    </main>
  )
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
  routeSnapshot: SessionSnapshot | null,
): SessionSnapshot | null {
  if (latestSnapshot?.roomCode === roomCode) {
    return latestSnapshot
  }

  if (routeSnapshot?.roomCode === roomCode) {
    return routeSnapshot
  }

  return null
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
