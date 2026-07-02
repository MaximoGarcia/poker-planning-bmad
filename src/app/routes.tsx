import { Navigate, Route, Routes } from 'react-router-dom'
import { CreateSessionView, ModeratorSessionView, ParticipantSessionView } from '@/features/session'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/session/:roomCode/moderator" element={<ModeratorSessionView />} />
      <Route path="/session/:roomCode" element={<ParticipantSessionView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function HomeRoute() {
  return <CreateSessionView />
}
