import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ERROR_CODES } from '@shared/contracts/errors'
import { DEFAULT_DECK_ID } from '@shared/domain/decks'
import { saveModeratorToken } from './session-storage'
import { useSessionSocket } from './useSessionSocket'

const DEFAULT_MODERATOR_NAME = 'Moderator'

export function CreateSessionView() {
  const navigate = useNavigate()
  const { connectionStatus, createSession } = useSessionSocket()
  const [moderatorName, setModeratorName] = useState(DEFAULT_MODERATOR_NAME)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const ack = await createSession({
      moderatorName: moderatorName.trim(),
      deckId: DEFAULT_DECK_ID,
    })

    setIsSubmitting(false)

    if (!ack.ok) {
      setErrorMessage(messageForErrorCode(ack.error.code))
      return
    }

    saveModeratorToken(ack.data.roomCode, ack.data.moderatorToken)
    navigate(`/session/${ack.data.roomCode}/moderator`, {
      state: {
        snapshot: ack.data.snapshot,
      },
    })
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="workspace session-create">
        <p className="eyebrow">Planning Poker</p>
        <h1 id="app-title">ADR Buddy</h1>
        <form className="create-session-form" onSubmit={handleSubmit}>
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
          <button className="primary-action" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating...' : 'Create session'}
          </button>
        </form>
        <p className="connection-state" data-status={connectionStatus}>
          {connectionStatus === 'connected' ? 'Live connection ready' : 'Connecting'}
        </p>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  )
}

function messageForErrorCode(code: string): string {
  if (code === ERROR_CODES.validationFailed) {
    return 'Check the moderator name and try again.'
  }

  if (code === ERROR_CODES.rateLimited) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  return 'Could not create a session. Please try again.'
}
