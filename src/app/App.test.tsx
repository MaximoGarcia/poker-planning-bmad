import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { App } from './App'

describe('App', () => {
  it('renders the ADR Buddy route shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'ADR Buddy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Moderator name')).toHaveValue('Moderator')
    expect(screen.getByRole('button', { name: 'Create session' })).toBeInTheDocument()
  })
})
