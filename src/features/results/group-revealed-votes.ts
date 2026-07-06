import type { RevealedVoteSnapshot } from '@shared/contracts/snapshots'
import type { PlanningDeck } from '@shared/domain/decks'
import type { ParticipantRole } from '@shared/domain/session-types'

export interface VoteResultGroup {
  value: string
  count: number
  voters: Array<{
    participantId: string
    displayName: string
    role: ParticipantRole
  }>
  isMajority: boolean
  isOutlier: boolean
}

export function groupRevealedVotes(
  deck: PlanningDeck,
  votes: readonly RevealedVoteSnapshot[],
): VoteResultGroup[] {
  const deckOrder = new Map(deck.values.map((value, index) => [value, index]))
  const groupsByValue = new Map<string, Omit<VoteResultGroup, 'isMajority' | 'isOutlier'>>()

  for (const vote of votes) {
    if (!deckOrder.has(vote.value)) {
      continue
    }

    const group =
      groupsByValue.get(vote.value) ??
      {
        value: vote.value,
        count: 0,
        voters: [],
      }

    group.count += 1
    group.voters.push({
      participantId: vote.participantId,
      displayName: vote.displayName,
      role: vote.role,
    })
    groupsByValue.set(vote.value, group)
  }

  const sortedGroups = Array.from(groupsByValue.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }

    return (deckOrder.get(left.value) ?? 0) - (deckOrder.get(right.value) ?? 0)
  })
  const maxCount = sortedGroups[0]?.count ?? 0
  const hasMultipleSelectedGroups = sortedGroups.length > 1

  return sortedGroups.map((group) => ({
    ...group,
    isMajority: group.count === maxCount && maxCount > 0,
    isOutlier: hasMultipleSelectedGroups && group.count < maxCount,
  }))
}
