import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ERROR_CODES } from '@shared/contracts/errors'
import { DEFAULT_DECK_ID } from '@shared/domain/decks'
import { saveModeratorToken, saveParticipantToken } from './session-storage'
import { useSessionSocket } from './useSessionSocket'

const DEFAULT_MODERATOR_NAME = 'Moderator'

export function CreateSessionView() {
  const navigate = useNavigate()
  const { connectionStatus, createSession, joinSession } = useSessionSocket()
  const [moderatorName, setModeratorName] = useState(DEFAULT_MODERATOR_NAME)
  const [roomCode, setRoomCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [joinSubmitting, setJoinSubmitting] = useState(false)
  const createSubmittingRef = useRef(false)
  const joinSubmittingRef = useRef(false)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null)

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (createSubmittingRef.current) {
      return
    }

    setCreateErrorMessage(null)
    setCreateSubmitting(true)
    createSubmittingRef.current = true

    try {
      const ack = await createSession({
        moderatorName: moderatorName.trim(),
        deckId: DEFAULT_DECK_ID,
      })

      if (!ack.ok) {
        setCreateErrorMessage(messageForCreateErrorCode(ack.error.code))
        return
      }

      if (!saveModeratorToken(ack.data.roomCode, ack.data.moderatorToken)) {
        setCreateErrorMessage('Could not store this session in the browser. Please try again.')
        return
      }

      navigate(`/session/${ack.data.roomCode}/moderator`, {
        state: {
          snapshot: ack.data.snapshot,
        },
      })
    } catch {
      setCreateErrorMessage(messageForCreateErrorCode(ERROR_CODES.connectionUnavailable))
    } finally {
      createSubmittingRef.current = false
      setCreateSubmitting(false)
    }
  }

  async function handleJoinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (joinSubmittingRef.current) {
      return
    }

    setJoinErrorMessage(null)
    setJoinSubmitting(true)
    joinSubmittingRef.current = true

    try {
      const ack = await joinSession({
        roomCode: roomCode.trim().toUpperCase(),
        displayName: displayName.trim(),
      })

      if (!ack.ok) {
        setJoinErrorMessage(messageForJoinErrorCode(ack.error.code))
        return
      }

      if (!saveParticipantToken(ack.data.roomCode, ack.data.participantId, ack.data.participantToken)) {
        setJoinErrorMessage('Could not store this session in the browser. Please try again.')
        return
      }

      navigate(`/session/${ack.data.roomCode}`, {
        state: {
          participantId: ack.data.participantId,
          snapshot: ack.data.snapshot,
        },
      })
    } catch {
      setJoinErrorMessage(messageForJoinErrorCode(ERROR_CODES.connectionUnavailable))
    } finally {
      joinSubmittingRef.current = false
      setJoinSubmitting(false)
    }
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="workspace session-create">
        <p className="eyebrow">Planning Poker</p>
        <h1 id="app-title">ADR Buddy</h1>
        <div className="entry-actions">
          <form className="session-entry-form" onSubmit={handleCreateSubmit}>
            <h2>Create</h2>
            <label className="field-label">
              <span>Moderator name</span>
              <input
                autoComplete="name"
                maxLength={80}
                name="moderatorName"
                onChange={(event) => setModeratorName(event.target.value)}
                required
                type="text"
                value={moderatorName}
              />
            </label>
            <button className="primary-action" disabled={createSubmitting} type="submit">
              {createSubmitting ? 'Creating...' : 'Create session'}
            </button>
            {createErrorMessage ? (
              <p className="form-error" role="alert">
                {createErrorMessage}
              </p>
            ) : null}
          </form>
          <form className="session-entry-form" onSubmit={handleJoinSubmit}>
            <h2>Join</h2>
            <label className="field-label">
              <span>Room code</span>
              <input
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={12}
                name="roomCode"
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                pattern="[A-Z0-9]{4,12}"
                required
                type="text"
                value={roomCode}
              />
            </label>
            <label className="field-label">
              <span>Display name</span>
              <input
                autoComplete="name"
                maxLength={80}
                name="displayName"
                onChange={(event) => setDisplayName(event.target.value)}
                required
                type="text"
                value={displayName}
              />
            </label>
            <button className="primary-action" disabled={joinSubmitting} type="submit">
              {joinSubmitting ? 'Joining...' : 'Join session'}
            </button>
            {joinErrorMessage ? (
              <p className="form-error" role="alert">
                {joinErrorMessage}
              </p>
            ) : null}
          </form>
        </div>
        <p className="connection-state" data-status={connectionStatus}>
          {connectionStatusLabel(connectionStatus)}
        </p>
      </section>
    </main>
  )
}

function messageForCreateErrorCode(code: string): string {
  if (code === ERROR_CODES.validationFailed) {
    return 'Check the moderator name and try again.'
  }

  if (code === ERROR_CODES.rateLimited) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  return 'Could not create a session. Please try again.'
}

function messageForJoinErrorCode(code: string): string {
  if (code === ERROR_CODES.validationFailed) {
    return 'Check the room code and display name, then try again.'
  }

  if (code === ERROR_CODES.invalidRoomCode) {
    return 'That room code is not active. Check it and try again.'
  }

  if (code === ERROR_CODES.rateLimited) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  return 'Could not join the session. Please try again.'
}

function connectionStatusLabel(status: string): string {
  if (status === 'connected') {
    return 'Live connection ready'
  }

  if (status === 'disconnected') {
    return 'Live connection unavailable'
  }

  return 'Connecting'
}
