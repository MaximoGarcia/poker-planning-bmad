import { screen } from '@testing-library/react'
import { render } from '@/test/render'
import { App } from './App'

describe('App', () => {
  it('renders the Poker Planning route shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Poker Planning' })).toBeInTheDocument()
    expect(screen.getByLabelText('Moderator name')).toHaveValue('Moderator')
    expect(screen.getByRole('button', { name: 'Create session' })).toBeInTheDocument()
  })
})
