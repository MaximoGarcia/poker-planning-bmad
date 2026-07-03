import { useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ERROR_CODES } from '@shared/contracts/errors'
import { PLANNING_DECKS, PLANNING_DECK_ID_VALUES, type PlanningDeckId } from '@shared/domain/decks'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import { SessionSnapshotSchema } from '@shared/schemas/session-schemas'
import { readModeratorToken } from './session-storage'
import { useSessionSocket } from './useSessionSocket'

interface ModeratorRouteState {
  snapshot?: unknown
}

export function ModeratorSessionView() {
  const { roomCode = '' } = useParams()
  const location = useLocation()
  const sessionSocket = useSessionSocket()
  const [copied, setCopied] = useState(false)
  const routeSnapshot = snapshotFromRouteState(location.state)
  const snapshot = selectSnapshot(roomCode, sessionSocket.latestSnapshot, routeSnapshot)
  const moderatorToken = roomCode ? readModeratorToken(roomCode) : null
  const participants =
    snapshot?.participants.filter((participant) => participant.role === 'participant') ?? []

  if (!roomCode || !moderatorToken || !snapshot) {
    return (
      <main className="app-shell app-shell--session" aria-labelledby="missing-session-title">
        <section className="workspace">
          <Link className="back-link" to="/">
            ADR Buddy
          </Link>
          <p className="eyebrow">Moderator room</p>
          <h1 id="missing-session-title">Session details unavailable</h1>
          <p className="lead">Return to ADR Buddy to create a new moderator session.</p>
        </section>
      </main>
    )
  }

  async function handleCopyRoomCode() {
    if (!navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="app-shell app-shell--session" aria-labelledby="moderator-session-title">
      <section className="workspace moderator-session">
        <Link className="back-link" to="/">
          ADR Buddy
        </Link>
        <p className="eyebrow">Room</p>
        <h1 id="moderator-session-title">Moderator room</h1>
        <div className="room-code-panel" aria-label="Room code">
          <span className="room-code">{snapshot.roomCode}</span>
          <button className="secondary-action" onClick={handleCopyRoomCode} type="button">
            {copied ? 'Copied' : 'Copy room code'}
          </button>
        </div>
        <StoryDeckEditor
          key={`${snapshot.story?.id ?? ''}:${snapshot.story?.title ?? ''}:${snapshot.deck.id}:${snapshot.round.active ? 'locked' : 'open'}`}
          moderatorToken={moderatorToken}
          roomCode={roomCode}
          sessionSnapshot={snapshot}
          sessionSocket={sessionSocket}
        />
        <section className="presence-section" aria-labelledby="presence-title">
          <div className="section-heading">
            <p className="eyebrow">Presence</p>
            <h2 id="presence-title">Participants</h2>
          </div>
          {participants.length === 0 ? (
            <p className="presence-empty">No participants have joined yet.</p>
          ) : (
            <ul className="presence-list" aria-label="Joined participants">
              {participants.map((participant) => (
                <li className="presence-list-item" key={participant.id}>
                  <span className="presence-name">{participant.displayName}</span>
                  <span className="presence-status-group">
                    <span className="presence-status">
                      {participant.connected ? 'Joined' : 'Away'}
                    </span>
                    <span className="presence-status">
                      {participant.hasVoted ? 'Voted' : 'Not voted'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  )
}

function StoryDeckEditor({
  moderatorToken,
  roomCode,
  sessionSnapshot,
  sessionSocket,
}: {
  moderatorToken: string
  roomCode: string
  sessionSnapshot: SessionSnapshot
  sessionSocket: ReturnType<typeof useSessionSocket>
}) {
  const [storyId, setStoryId] = useState(sessionSnapshot.story?.id ?? '')
  const [storyTitle, setStoryTitle] = useState(sessionSnapshot.story?.title ?? '')
  const [pendingStoryUpdate, setPendingStoryUpdate] = useState(false)
  const [pendingDeckId, setPendingDeckId] = useState<PlanningDeckId | null>(null)
  const [commandError, setCommandError] = useState<string | null>(null)
  const commandPending = pendingStoryUpdate || Boolean(pendingDeckId)

  async function handleStorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setPendingStoryUpdate(true)
    setCommandError(null)

    const result = await sessionSocket.updateStory({
      roomCode,
      moderatorToken,
      storyId,
      title: storyTitle,
    })

    setPendingStoryUpdate(false)

    if (!result.ok) {
      setCommandError(errorMessageForCode(result.error.code))
    }
  }

  async function handleDeckSelect(deckId: PlanningDeckId) {
    setPendingDeckId(deckId)
    setCommandError(null)

    const result = await sessionSocket.selectDeck({
      roomCode,
      moderatorToken,
      deckId,
    })

    setPendingDeckId(null)

    if (!result.ok) {
      setCommandError(errorMessageForCode(result.error.code))
    }
  }

  return (
    <section className="session-summary" aria-labelledby="story-controls-title">
      <div className="section-heading">
        <p className="eyebrow">Current story</p>
        <h2 id="story-controls-title">Story and deck</h2>
      </div>
      <form aria-label="Current story form" onSubmit={handleStorySubmit}>
        <label>
          Story identifier
          <input
            aria-label="Story identifier"
            disabled={commandPending || sessionSnapshot.round.active}
            maxLength={120}
            onChange={(event) => setStoryId(event.target.value)}
            required
            type="text"
            value={storyId}
          />
        </label>
        <label>
          Brief description
          <input
            aria-label="Brief description"
            disabled={commandPending || sessionSnapshot.round.active}
            maxLength={240}
            onChange={(event) => setStoryTitle(event.target.value)}
            required
            type="text"
            value={storyTitle}
          />
        </label>
        <button
          className="primary-action"
          disabled={commandPending || sessionSnapshot.round.active}
          type="submit"
        >
          {pendingStoryUpdate ? 'Saving story...' : 'Save story'}
        </button>
      </form>
      <div aria-label="Deck selection" role="group">
        {PLANNING_DECK_ID_VALUES.map((deckId) => {
          const deck = PLANNING_DECKS[deckId]
          const isActive = sessionSnapshot.deck.id === deckId
          const isPending = pendingDeckId === deckId

          return (
            <button
              aria-pressed={isActive}
              className="secondary-action"
              disabled={commandPending || sessionSnapshot.round.active}
              key={deckId}
              onClick={() => void handleDeckSelect(deckId)}
              type="button"
            >
              {isPending ? `Switching to ${deck.label}...` : deck.label}
            </button>
          )
        })}
      </div>
      {commandError ? <p role="alert">{commandError}</p> : null}
      {sessionSnapshot.story ? (
        <section aria-labelledby="active-story-title">
          <h3 id="active-story-title">{sessionSnapshot.story.id}</h3>
          <p>{sessionSnapshot.story.title}</p>
        </section>
      ) : (
        <section className="empty-state" aria-labelledby="active-story-title">
          <h2 id="active-story-title">No active story yet</h2>
          <p>Ready for the first story.</p>
        </section>
      )}
      <p>Deck: {sessionSnapshot.deck.label}</p>
      <section className="deck-options" aria-label="Moderator deck options">
        <h3>{sessionSnapshot.deck.label} options</h3>
        <ul>
          {sessionSnapshot.deck.values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </section>
      <p>
        {sessionSnapshot.round.active
          ? 'Story and deck are locked during an active round.'
          : 'Story and deck are ready to edit.'}
      </p>
    </section>
  )
}

function errorMessageForCode(code: string): string {
  switch (code) {
    case ERROR_CODES.storyLocked:
      return 'Story and deck changes are locked while a round is active.'
    case ERROR_CODES.unauthorized:
      return 'Only the moderator can update the current story and deck.'
    default:
      return 'The story or deck update could not be completed.'
  }
}

function snapshotFromRouteState(state: unknown): SessionSnapshot | null {
  const candidate = (state as ModeratorRouteState | null)?.snapshot
  const parsed = SessionSnapshotSchema.safeParse(candidate)

  return parsed.success ? parsed.data : null
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
