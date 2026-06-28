import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { CreateSessionView, ModeratorSessionView } from '@/features/session'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/session/:roomCode/moderator" element={<ModeratorSessionView />} />
      <Route path="/session/:roomCode" element={<SessionRoute role="participant" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function HomeRoute() {
  return <CreateSessionView />
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
