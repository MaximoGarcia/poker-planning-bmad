import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { App } from './App'

describe('App', () => {
  it('renders the ADR Buddy route shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'ADR Buddy' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Moderator room' })).toHaveAttribute(
      'href',
      '/session/ABC123/moderator',
    )
    expect(screen.getByText('Fibonacci')).toBeInTheDocument()
  })
})
