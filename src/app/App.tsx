import { BrowserRouter } from 'react-router-dom'
import { SessionSocketProvider } from '@/features/session'
import { AppRoutes } from './routes'
import './styles.css'

export function App() {
  return (
    <BrowserRouter>
      <SessionSocketProvider>
        <AppRoutes />
      </SessionSocketProvider>
    </BrowserRouter>
  )
}

export default App
