import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
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
  const { latestSnapshot } = useSessionSocket()
  const [copied, setCopied] = useState(false)
  const routeSnapshot = snapshotFromRouteState(location.state)
  const snapshot = selectSnapshot(roomCode, latestSnapshot, routeSnapshot)
  const moderatorToken = roomCode ? readModeratorToken(roomCode) : null

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
        <section className="empty-state" aria-labelledby="active-story-title">
          <h2 id="active-story-title">No active story yet</h2>
          <p>Ready for the first story.</p>
        </section>
      </section>
    </main>
  )
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
