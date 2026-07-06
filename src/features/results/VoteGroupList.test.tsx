import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/test/render'
import { PLANNING_DECKS } from '@shared/domain/decks'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import { VoteGroupList } from './VoteGroupList'

const revealedSnapshot: SessionSnapshot = {
  roomCode: 'ABCD12',
  deck: PLANNING_DECKS.fibonacci,
  story: {
    id: 'ADR-21',
    title: 'Estimate grouped results',
    locked: true,
  },
  participants: [
    {
      id: 'moderator-1',
      displayName: 'Maxi',
      role: 'moderator',
      connected: true,
      hasVoted: true,
    },
    {
      id: 'participant-1',
      displayName: 'Ana',
      role: 'participant',
      connected: true,
      hasVoted: true,
    },
    {
      id: 'participant-2',
      displayName: 'Ben',
      role: 'participant',
      connected: true,
      hasVoted: true,
    },
    {
      id: 'participant-3',
      displayName: 'Chen',
      role: 'participant',
      connected: true,
      hasVoted: true,
    },
  ],
  round: {
    active: true,
    revealed: true,
    voteCount: 4,
  },
  results: {
    votes: [
      {
        participantId: 'moderator-1',
        displayName: 'Maxi',
        role: 'moderator',
        value: '5',
      },
      {
        participantId: 'participant-1',
        displayName: 'Ana',
        role: 'participant',
        value: '5',
      },
      {
        participantId: 'participant-2',
        displayName: 'Ben',
        role: 'participant',
        value: '8',
      },
      {
        participantId: 'participant-3',
        displayName: 'Chen',
        role: 'participant',
        value: '99',
      },
    ],
  },
  updatedAt: '2026-07-03T12:00:00.000Z',
}

describe('VoteGroupList', () => {
  it('renders nothing before results are revealed', () => {
    const { container } = render(
      <VoteGroupList
        headingLevel={2}
        snapshot={{
          ...revealedSnapshot,
          round: {
            active: true,
            revealed: false,
            voteCount: 2,
          },
          results: null,
        }}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders grouped majority and outlier results with accessible labels', () => {
    render(<VoteGroupList headingLevel={2} snapshot={revealedSnapshot} />)

    expect(screen.getByRole('heading', { name: 'Revealed votes' })).toBeInTheDocument()
    expect(screen.getByLabelText('Majority: 2 votes for 5 by Maxi, Ana')).toBeInTheDocument()
    expect(screen.getByLabelText('Outlier: 1 vote for 8 by Ben')).toBeInTheDocument()
    expect(screen.queryByText('99')).not.toBeInTheDocument()

    const majorityGroup = screen
      .getByLabelText('Majority: 2 votes for 5 by Maxi, Ana')
      .closest('li')

    expect(majorityGroup).toBeInTheDocument()
    expect(within(majorityGroup as HTMLElement).getByText('5')).toBeInTheDocument()
    expect(within(majorityGroup as HTMLElement).getByText('2 votes')).toBeInTheDocument()
    expect(within(majorityGroup as HTMLElement).getByText('Majority')).toBeInTheDocument()
    expect(within(majorityGroup as HTMLElement).getByText('Maxi')).toBeInTheDocument()
    expect(within(majorityGroup as HTMLElement).getByText('Ana')).toBeInTheDocument()
  })

  it('renders an explicit empty revealed state when no votes were submitted', () => {
    render(
      <VoteGroupList
        headingLevel={3}
        snapshot={{
          ...revealedSnapshot,
          results: {
            votes: [],
          },
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Revealed votes' })).toBeInTheDocument()
    expect(screen.getByText('No votes were submitted.')).toBeInTheDocument()
  })

  it('does not claim no votes were submitted when all votes are unsupported', () => {
    render(
      <VoteGroupList
        headingLevel={3}
        snapshot={{
          ...revealedSnapshot,
          deck: PLANNING_DECKS.tshirt,
          results: {
            votes: [
              {
                participantId: 'participant-3',
                displayName: 'Chen',
                role: 'participant',
                value: '99',
              },
            ],
          },
        }}
      />,
    )

    expect(screen.getByText('No valid votes were available for this deck.')).toBeInTheDocument()
    expect(screen.queryByText('No votes were submitted.')).not.toBeInTheDocument()
  })
})
