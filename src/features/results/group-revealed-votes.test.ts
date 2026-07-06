import { describe, expect, it } from 'vitest'
import { PLANNING_DECKS } from '@shared/domain/decks'
import type { RevealedVoteSnapshot } from '@shared/contracts/snapshots'
import { groupRevealedVotes } from './group-revealed-votes'

function vote(
  participantId: string,
  displayName: string,
  value: string,
): RevealedVoteSnapshot {
  return {
    participantId,
    displayName,
    role: 'participant',
    value,
  }
}

describe('groupRevealedVotes', () => {
  it('sorts groups by count descending and uses deck order for stable ties', () => {
    const groups = groupRevealedVotes(PLANNING_DECKS.fibonacci, [
      vote('p1', 'Ana', '8'),
      vote('p2', 'Ben', '3'),
      vote('p3', 'Chen', '8'),
      vote('p4', 'Dev', '5'),
      vote('p5', 'Eli', '3'),
    ])

    expect(groups.map((group) => group.value)).toEqual(['3', '8', '5'])
    expect(groups.map((group) => group.count)).toEqual([2, 2, 1])
  })

  it('marks all highest-count groups as majority and lower-count groups as outliers', () => {
    const groups = groupRevealedVotes(PLANNING_DECKS.fibonacci, [
      vote('p1', 'Ana', '5'),
      vote('p2', 'Ben', '8'),
      vote('p3', 'Chen', '5'),
      vote('p4', 'Dev', '8'),
      vote('p5', 'Eli', '13'),
    ])

    expect(groups).toMatchObject([
      { value: '5', count: 2, isMajority: true, isOutlier: false },
      { value: '8', count: 2, isMajority: true, isOutlier: false },
      { value: '13', count: 1, isMajority: false, isOutlier: true },
    ])
  })

  it('does not mark a single selected-card group as an outlier', () => {
    const groups = groupRevealedVotes(PLANNING_DECKS.fibonacci, [
      vote('p1', 'Ana', 'Coffee'),
      vote('p2', 'Ben', 'Coffee'),
    ])

    expect(groups).toMatchObject([
      { value: 'Coffee', count: 2, isMajority: true, isOutlier: false },
    ])
  })

  it('filters unsupported values instead of rendering them as valid groups', () => {
    const groups = groupRevealedVotes(PLANNING_DECKS.tshirt, [
      vote('p1', 'Ana', 'S'),
      vote('p2', 'Ben', 'Coffee'),
      vote('p3', 'Chen', 'XL'),
      vote('p4', 'Dev', '13'),
    ])

    expect(groups.map((group) => group.value)).toEqual(['S', 'XL'])
    expect(groups.flatMap((group) => group.voters.map((voter) => voter.displayName))).toEqual([
      'Ana',
      'Chen',
    ])
  })

  it('supports every MVP T-shirt value in deck order for tied groups', () => {
    const groups = groupRevealedVotes(PLANNING_DECKS.tshirt, [
      vote('p1', 'Ana', 'XL'),
      vote('p2', 'Ben', 'XS'),
      vote('p3', 'Chen', 'L'),
      vote('p4', 'Dev', 'M'),
      vote('p5', 'Eli', 'S'),
    ])

    expect(groups.map((group) => group.value)).toEqual(['XS', 'S', 'M', 'L', 'XL'])
  })

  it('keeps voters in revealed vote order within each group', () => {
    const groups = groupRevealedVotes(PLANNING_DECKS.fibonacci, [
      vote('p3', 'Chen', '5'),
      vote('p1', 'Ana', '5'),
      vote('p2', 'Ben', '5'),
    ])

    expect(groups[0]?.voters.map((voter) => voter.displayName)).toEqual(['Chen', 'Ana', 'Ben'])
  })
})
