import { useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ERROR_CODES } from '@shared/contracts/errors'
import { PLANNING_DECKS, PLANNING_DECK_ID_VALUES, type PlanningDeckId } from '@shared/domain/decks'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import { SessionSnapshotSchema } from '@shared/schemas/session-schemas'
import { EstimatedStoriesList } from '../results/EstimatedStoriesList'
import { VoteGroupList } from '../results/VoteGroupList'
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
  const [acceptedSnapshot, setAcceptedSnapshot] = useState<SessionSnapshot | null>(null)
  const routeSnapshot = snapshotFromRouteState(location.state)
  const snapshot = selectSnapshot(roomCode, sessionSocket.latestSnapshot, acceptedSnapshot, routeSnapshot)
  const moderatorToken = roomCode ? readModeratorToken(roomCode) : null
  const participants =
    snapshot?.participants.filter((participant) => participant.role === 'participant') ?? []

  if (!roomCode || !snapshot) {
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
          onAcceptedSnapshot={setAcceptedSnapshot}
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
            <ul className="presence-list" aria-label="Joined participants" aria-live="polite">
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
  onAcceptedSnapshot,
  roomCode,
  sessionSnapshot,
  sessionSocket,
}: {
  moderatorToken: string | null
  onAcceptedSnapshot: (snapshot: SessionSnapshot) => void
  roomCode: string
  sessionSnapshot: SessionSnapshot
  sessionSocket: ReturnType<typeof useSessionSocket>
}) {
  const [storyId, setStoryId] = useState(sessionSnapshot.story?.id ?? '')
  const [storyTitle, setStoryTitle] = useState(sessionSnapshot.story?.title ?? '')
  const [pendingStoryUpdate, setPendingStoryUpdate] = useState(false)
  const [pendingDeckId, setPendingDeckId] = useState<PlanningDeckId | null>(null)
  const [pendingRoundStart, setPendingRoundStart] = useState(false)
  const [pendingReveal, setPendingReveal] = useState(false)
  const [pendingReset, setPendingReset] = useState(false)
  const [pendingVoteValue, setPendingVoteValue] = useState<string | null>(null)
  const [pendingEstimateValue, setPendingEstimateValue] = useState<string | null>(null)
  const [pendingAdvance, setPendingAdvance] = useState(false)
  const [lastSubmittedValue, setLastSubmittedValue] = useState<string | null>(null)
  const [voteStatusMessage, setVoteStatusMessage] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [estimateError, setEstimateError] = useState<string | null>(null)
  const [commandError, setCommandError] = useState<string | null>(null)
  const commandPending =
    pendingStoryUpdate ||
    Boolean(pendingDeckId) ||
    pendingRoundStart ||
    pendingReveal ||
    pendingReset ||
    Boolean(pendingVoteValue) ||
    Boolean(pendingEstimateValue) ||
    pendingAdvance
  const moderator = sessionSnapshot.participants.find((participant) => participant.role === 'moderator')
  const visibleLastSubmittedValue = moderator?.hasVoted ? lastSubmittedValue : null
  const visibleVoteStatusMessage = moderator?.hasVoted ? voteStatusMessage : null
  const currentEstimatedStory = sessionSnapshot.estimatedStories?.find(
    (estimatedStory) => estimatedStory.storyId === sessionSnapshot.story?.id,
  )
  const currentRoundHasFinalEstimate = Boolean(
    sessionSnapshot.currentStoryHasFinalEstimate && currentEstimatedStory,
  )

  async function handleResetRound() {
    if (!moderatorToken || !canResetRound(sessionSnapshot, moderatorToken)) {
      return
    }

    setPendingReset(true)
    setCommandError(null)

    const result = await sessionSocket.resetRound({
      roomCode,
      moderatorToken,
    })

    setPendingReset(false)

    if (!result.ok) {
      setCommandError(resetErrorMessageForCode(result.error.code))
      return
    }

    onAcceptedSnapshot(result.data)
  }

  async function handleStorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!moderatorToken) {
      return
    }

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
    if (!moderatorToken) {
      return
    }

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

  async function handleStartRound() {
    if (!moderatorToken) {
      return
    }

    setPendingRoundStart(true)
    setCommandError(null)

    const result = await sessionSocket.startRound({
      roomCode,
      moderatorToken,
    })

    setPendingRoundStart(false)

    if (!result.ok) {
      setCommandError(errorMessageForCode(result.error.code))
    }
  }

  async function handleVoteSubmit(value: string) {
    if (!moderatorToken || !canSubmitModeratorVote(sessionSnapshot, moderatorToken)) {
      return
    }

    const wasChangingVote = moderator?.hasVoted ?? false
    setPendingVoteValue(value)
    setVoteError(null)
    setVoteStatusMessage(null)

    const result = await sessionSocket.submitVote({
      roomCode,
      moderatorToken,
      value,
    })

    setPendingVoteValue(null)

    if (!result.ok) {
      setVoteError(voteErrorMessageForCode(result.error.code))
      return
    }

    onAcceptedSnapshot(result.data)
    setLastSubmittedValue(value)
    setVoteStatusMessage(wasChangingVote ? 'Vote change submitted' : 'Vote submitted')
  }

  async function handleRevealRound() {
    if (!moderatorToken || !canRevealRound(sessionSnapshot, moderatorToken)) {
      return
    }

    setPendingReveal(true)
    setCommandError(null)

    const result = await sessionSocket.revealRound({
      roomCode,
      moderatorToken,
    })

    setPendingReveal(false)

    if (!result.ok) {
      setCommandError(revealErrorMessageForCode(result.error.code))
      return
    }

    onAcceptedSnapshot(result.data)
  }

  async function handleEstimateRecord(value: string) {
    if (!moderatorToken || !canRecordFinalEstimate(sessionSnapshot, moderatorToken)) {
      return
    }

    setPendingEstimateValue(value)
    setEstimateError(null)

    const result = await sessionSocket.recordEstimate({
      roomCode,
      moderatorToken,
      value,
    })

    setPendingEstimateValue(null)

    if (!result.ok) {
      setEstimateError(estimateErrorMessageForCode(result.error.code))
      return
    }

    onAcceptedSnapshot(result.data)
  }

  async function handleAdvanceStory() {
    if (!moderatorToken || !canAdvanceStory(sessionSnapshot, moderatorToken)) {
      return
    }

    setPendingAdvance(true)
    setCommandError(null)
    setEstimateError(null)

    const result = await sessionSocket.advanceStory({
      roomCode,
      moderatorToken,
    })

    setPendingAdvance(false)

    if (!result.ok) {
      setCommandError(advanceErrorMessageForCode(result.error.code))
      return
    }

    onAcceptedSnapshot(result.data)
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
            disabled={!moderatorToken || commandPending || sessionSnapshot.round.active}
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
            disabled={!moderatorToken || commandPending || sessionSnapshot.round.active}
            maxLength={240}
            onChange={(event) => setStoryTitle(event.target.value)}
            required
            type="text"
            value={storyTitle}
          />
        </label>
        <button
          className="primary-action"
          disabled={!moderatorToken || commandPending || sessionSnapshot.round.active}
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
              disabled={!moderatorToken || commandPending || sessionSnapshot.round.active}
              key={deckId}
              onClick={() => void handleDeckSelect(deckId)}
              type="button"
            >
              {isPending ? `Switching to ${deck.label}...` : deck.label}
            </button>
          )
        })}
      </div>
      <button
        className="primary-action"
        disabled={!moderatorToken || commandPending || sessionSnapshot.round.active || !sessionSnapshot.story}
        onClick={() => void handleStartRound()}
        type="button"
      >
        {sessionSnapshot.round.active
          ? 'Round active'
          : pendingRoundStart
            ? 'Starting round...'
          : 'Start round'}
      </button>
      {sessionSnapshot.round.active && !sessionSnapshot.round.revealed ? (
        <>
          <button
            className="primary-action"
            disabled={!canRevealRound(sessionSnapshot, moderatorToken) || commandPending}
            onClick={() => void handleRevealRound()}
            type="button"
          >
            {pendingReveal ? 'Revealing results...' : 'Reveal results'}
          </button>
          <button
            className="secondary-action"
            disabled={!canResetRound(sessionSnapshot, moderatorToken) || commandPending}
            onClick={() => void handleResetRound()}
            type="button"
          >
            {pendingReset ? 'Resetting round...' : 'Reset round'}
          </button>
        </>
      ) : null}
      {sessionSnapshot.round.revealed ? (
        <button
          className="secondary-action"
          disabled={!canResetRound(sessionSnapshot, moderatorToken) || commandPending}
          onClick={() => void handleResetRound()}
          type="button"
        >
          {pendingReset ? 'Resetting round...' : 'Reset round'}
        </button>
      ) : null}
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
        {sessionSnapshot.round.active && !sessionSnapshot.round.revealed ? (
          <ul aria-label="Moderator vote cards" className="vote-card-grid" role="group">
            {sessionSnapshot.deck.values.map((value) => (
              <li key={value}>
                <button
                  aria-label={moderatorVoteButtonLabel({
                    hasVoted: moderator?.hasVoted ?? false,
                    isAvailable: canSubmitModeratorVote(sessionSnapshot, moderatorToken),
                    isPending: pendingVoteValue === value,
                    value,
                  })}
                  aria-pressed={visibleLastSubmittedValue === value}
                  className="vote-card-button"
                  disabled={
                    !canSubmitModeratorVote(sessionSnapshot, moderatorToken) || pendingVoteValue !== null
                  }
                  onClick={() => void handleVoteSubmit(value)}
                  type="button"
                >
                  <span>{value}</span>
                  {visibleLastSubmittedValue === value ? <small>Selected</small> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul>
            {sessionSnapshot.deck.values.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        )}
      </section>
      {visibleVoteStatusMessage ? <p className="vote-status">{visibleVoteStatusMessage}</p> : null}
      {voteError ? (
        <p className="form-error" role="alert">
          {voteError}
        </p>
      ) : null}
      <VoteGroupList headingLevel={3} snapshot={sessionSnapshot} />
      <EstimatedStoriesList headingLevel={3} snapshot={sessionSnapshot} />
      {sessionSnapshot.round.revealed && sessionSnapshot.story ? (
        <section className="final-estimate-section" aria-labelledby="final-estimate-title">
          <h3 id="final-estimate-title">Final estimate</h3>
          <ul aria-label="Final estimate options" className="vote-card-grid" role="group">
            {sessionSnapshot.deck.values.map((value) => {
              const isPending = pendingEstimateValue === value
              const isRecorded =
                currentRoundHasFinalEstimate && currentEstimatedStory?.finalEstimate === value

              return (
                <li key={value}>
                  <button
                    aria-label={finalEstimateButtonLabel({
                      isAvailable: canRecordFinalEstimate(sessionSnapshot, moderatorToken),
                      isPending,
                      isRecorded,
                      value,
                    })}
                    aria-pressed={isRecorded}
                    className="vote-card-button"
                    disabled={
                      !canRecordFinalEstimate(sessionSnapshot, moderatorToken) ||
                      pendingEstimateValue !== null
                    }
                    onClick={() => void handleEstimateRecord(value)}
                    type="button"
                  >
                    <span>{value}</span>
                    {isPending ? <small>Recording</small> : null}
                    {isRecorded && !isPending ? <small>Recorded</small> : null}
                  </button>
                </li>
              )
            })}
          </ul>
          {currentRoundHasFinalEstimate ? (
            <p className="vote-status">Recorded estimate: {currentEstimatedStory?.finalEstimate}</p>
          ) : null}
          {estimateError ? (
            <p className="form-error" role="alert">
              {estimateError}
            </p>
          ) : null}
          <button
            className="primary-action"
            disabled={!canAdvanceStory(sessionSnapshot, moderatorToken) || commandPending}
            onClick={() => void handleAdvanceStory()}
            type="button"
          >
            {pendingAdvance ? 'Advancing story...' : 'Advance to next story'}
          </button>
        </section>
      ) : null}
      <p>
        {sessionSnapshot.round.active
          ? 'Story and deck are locked during an active round.'
          : 'Story and deck are ready to edit.'}
      </p>
    </section>
  )
}

function canSubmitModeratorVote(snapshot: SessionSnapshot, moderatorToken: string | null): boolean {
  return Boolean(moderatorToken && snapshot.round.active && !snapshot.round.revealed)
}

function canRevealRound(snapshot: SessionSnapshot, moderatorToken: string | null): boolean {
  return Boolean(moderatorToken && snapshot.round.active && !snapshot.round.revealed)
}

function canRecordFinalEstimate(snapshot: SessionSnapshot, moderatorToken: string | null): boolean {
  return Boolean(moderatorToken && snapshot.round.revealed && snapshot.story)
}

function canResetRound(snapshot: SessionSnapshot, moderatorToken: string | null): boolean {
  return Boolean(moderatorToken && snapshot.round.active)
}

function canAdvanceStory(snapshot: SessionSnapshot, moderatorToken: string | null): boolean {
  return Boolean(
    moderatorToken &&
      snapshot.round.revealed &&
      snapshot.story &&
      snapshot.currentStoryHasFinalEstimate,
  )
}

function moderatorVoteButtonLabel({
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
    return `Submitting moderator vote ${value}...`
  }

  if (!isAvailable) {
    return `Voting unavailable for moderator card ${value}`
  }

  return hasVoted ? `Change moderator vote to ${value}` : `Submit moderator vote ${value}`
}

function finalEstimateButtonLabel({
  isAvailable,
  isPending,
  isRecorded,
  value,
}: {
  isAvailable: boolean
  isPending: boolean
  isRecorded: boolean
  value: string
}): string {
  if (isPending) {
    return `Recording final estimate ${value}...`
  }

  if (!isAvailable) {
    return `Final estimate unavailable for ${value}`
  }

  return isRecorded ? `Recorded final estimate ${value}` : `Record final estimate ${value}`
}

function errorMessageForCode(code: string): string {
  switch (code) {
    case ERROR_CODES.storyRequired:
      return 'Choose a current story before starting a voting round.'
    case ERROR_CODES.storyLocked:
      return 'Story and deck changes are locked while a round is active.'
    case ERROR_CODES.unauthorized:
      return 'Only the moderator can control this session.'
    default:
      return 'The moderator command could not be completed.'
  }
}

function voteErrorMessageForCode(code: string): string {
  switch (code) {
    case ERROR_CODES.roundNotActive:
      return 'Voting is not active right now.'
    case ERROR_CODES.voteLocked:
      return 'Votes are locked for this round.'
    case ERROR_CODES.unauthorized:
      return 'Only the moderator can vote in this session.'
    case ERROR_CODES.validationFailed:
      return 'That card is not available in the active deck.'
    default:
      return 'Vote could not be submitted. Please try again.'
  }
}

function revealErrorMessageForCode(code: string): string {
  switch (code) {
    case ERROR_CODES.roundNotActive:
      return 'Voting is not active right now.'
    case ERROR_CODES.unauthorized:
      return 'Only the moderator can reveal results.'
    case ERROR_CODES.validationFailed:
      return 'Reveal request could not be validated.'
    default:
      return 'Results could not be revealed. Please try again.'
  }
}

function estimateErrorMessageForCode(code: string): string {
  switch (code) {
    case ERROR_CODES.resultsNotRevealed:
      return 'Reveal results before recording a final estimate.'
    case ERROR_CODES.unauthorized:
      return 'Only the moderator can record a final estimate.'
    case ERROR_CODES.validationFailed:
      return 'Choose a final estimate from the active deck.'
    default:
      return 'Final estimate could not be recorded. Please try again.'
  }
}

function resetErrorMessageForCode(code: string): string {
  switch (code) {
    case ERROR_CODES.roundNotActive:
      return 'Voting is not active right now.'
    case ERROR_CODES.unauthorized:
      return 'Only the moderator can reset the round.'
    default:
      return 'Round could not be reset. Please try again.'
  }
}

function advanceErrorMessageForCode(code: string): string {
  switch (code) {
    case ERROR_CODES.finalEstimateRequired:
      return 'Record a final estimate before advancing to the next story.'
    case ERROR_CODES.unauthorized:
      return 'Only the moderator can advance to the next story.'
    case ERROR_CODES.storyRequired:
      return 'Choose a current story before advancing.'
    default:
      return 'Story could not be advanced. Please try again.'
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
