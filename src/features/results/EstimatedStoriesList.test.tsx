import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import { PLANNING_DECKS } from '@shared/domain/decks'
import { EstimatedStoriesList } from './EstimatedStoriesList'

const baseSnapshot = {
  roomCode: 'ABCD12',
  deck: PLANNING_DECKS.fibonacci,
  story: null,
  participants: [],
  round: {
    active: false,
    revealed: false,
    voteCount: 0,
  },
  results: null,
  updatedAt: '2026-07-08T15:00:00.000Z',
}

describe('EstimatedStoriesList', () => {
  it('shows a moderator-facing empty state when no estimates exist', () => {
    render(<EstimatedStoriesList snapshot={baseSnapshot} />)

    expect(screen.getByRole('heading', { name: 'Estimated stories' })).toBeInTheDocument()
    expect(screen.getByText('No estimates recorded yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Estimated stories list' })).not.toBeInTheDocument()
  })

  it('renders a single estimated story with readable field labels', () => {
    render(
      <EstimatedStoriesList
        snapshot={{
          ...baseSnapshot,
          estimatedStories: [
            {
              storyId: 'ADR-21',
              title: 'Estimate socket moderation flow',
              deck: PLANNING_DECKS.fibonacci,
              finalEstimate: '8',
            },
          ],
        }}
      />,
    )

    const item = screen.getByRole('listitem')

    expect(within(item).getByText('Story identifier')).toBeInTheDocument()
    expect(within(item).getByText('ADR-21')).toBeInTheDocument()
    expect(within(item).getByText('Brief description')).toBeInTheDocument()
    expect(within(item).getByText('Estimate socket moderation flow')).toBeInTheDocument()
    expect(within(item).getByText('Deck')).toBeInTheDocument()
    expect(within(item).getByText('Fibonacci')).toBeInTheDocument()
    expect(within(item).getByText('Final estimate')).toBeInTheDocument()
    expect(within(item).getByText('8')).toBeInTheDocument()
  })

  it('renders multiple estimated stories from snapshot order', () => {
    render(
      <EstimatedStoriesList
        snapshot={{
          ...baseSnapshot,
          estimatedStories: [
            {
              storyId: 'ADR-21',
              title: 'Estimate socket moderation flow',
              deck: PLANNING_DECKS.fibonacci,
              finalEstimate: '8',
            },
            {
              storyId: 'ADR-34',
              title: 'Advance to the next story',
              deck: PLANNING_DECKS.tshirt,
              finalEstimate: 'L',
            },
          ],
        }}
      />,
    )

    const items = screen.getAllByRole('listitem')

    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('ADR-21')).toBeInTheDocument()
    expect(within(items[1]).getByText('ADR-34')).toBeInTheDocument()
    expect(within(items[1]).getByText('T-shirt')).toBeInTheDocument()
    expect(within(items[1]).getByText('L')).toBeInTheDocument()
  })
})
