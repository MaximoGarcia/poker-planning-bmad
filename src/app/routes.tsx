import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { PLANNING_DECKS } from '@shared/domain/decks'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/session/:roomCode/moderator" element={<SessionRoute role="moderator" />} />
      <Route path="/session/:roomCode" element={<SessionRoute role="participant" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function HomeRoute() {
  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="workspace">
        <p className="eyebrow">Planning Poker</p>
        <h1 id="app-title">ADR Buddy</h1>
        <p className="lead">
          A focused room shell for moderator and participant workflows.
        </p>
        <nav className="route-actions" aria-label="Sample session routes">
          <Link to="/session/ABC123/moderator">Moderator room</Link>
          <Link to="/session/ABC123">Participant room</Link>
        </nav>
      </section>
      <section className="deck-strip" aria-label="Available estimate decks">
        {Object.values(PLANNING_DECKS).map((deck) => (
          <div className="deck-summary" key={deck.id}>
            <span>{deck.label}</span>
            <strong>{deck.values.join(' ')}</strong>
          </div>
        ))}
      </section>
    </main>
  )
}

function SessionRoute({ role }: { role: 'moderator' | 'participant' }) {
  const { roomCode = '' } = useParams()
  const title = role === 'moderator' ? 'Moderator room' : 'Participant room'

  return (
    <main className="app-shell app-shell--session" aria-labelledby="session-title">
      <section className="workspace">
        <Link className="back-link" to="/">
          ADR Buddy
        </Link>
        <p className="eyebrow">Room {roomCode}</p>
        <h1 id="session-title">{title}</h1>
        <p className="lead">Live session controls will appear here as the workflow stories land.</p>
      </section>
    </main>
  )
}
