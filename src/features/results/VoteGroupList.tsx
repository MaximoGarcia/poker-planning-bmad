import type { ElementType } from 'react'
import type { SessionSnapshot } from '@shared/contracts/snapshots'
import { groupRevealedVotes, type VoteResultGroup } from './group-revealed-votes'

interface VoteGroupListProps {
  headingLevel?: 2 | 3
  snapshot: SessionSnapshot
}

export function VoteGroupList({ headingLevel = 2, snapshot }: VoteGroupListProps) {
  if (!snapshot.round.revealed || !snapshot.results) {
    return null
  }

  const Heading = `h${headingLevel}` as ElementType
  const groups = groupRevealedVotes(snapshot.deck, snapshot.results.votes)
  const votedParticipantIds = new Set(snapshot.results.votes.map((vote) => vote.participantId))
  const nonVoters = snapshot.participants.filter(
    (participant) => participant.role === 'participant' && !participant.hasVoted && !votedParticipantIds.has(participant.id),
  )

  return (
    <section className="revealed-results" aria-labelledby="revealed-results-title">
      <Heading id="revealed-results-title">Revealed votes</Heading>
      {groups.length === 0 ? (
        <p>
          {snapshot.results.votes.length === 0
            ? 'No votes were submitted.'
            : 'No valid votes were available for this deck.'}
        </p>
      ) : (
        <ul aria-label="Grouped revealed votes" className="vote-group-list">
          {groups.map((group) => (
            <li
              aria-label={groupAccessibleLabel(group)}
              className="vote-group-list-item"
              key={`${group.value}:${group.voters.map((voter) => voter.participantId).join(':')}`}
            >
              <div className="vote-group-card">
                <span className="vote-group-value">{group.value}</span>
                <span className="vote-group-count">{voteCountLabel(group.count)}</span>
              </div>
              <div className="vote-group-detail">
                <span className="vote-group-status">
                  {group.isMajority ? 'Majority' : group.isOutlier ? 'Outlier' : 'Result'}
                </span>
                <ul aria-label={`${group.value} voters`} className="vote-group-voters">
                  {group.voters.map((voter) => (
                    <li key={voter.participantId}>{voter.displayName}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
      {nonVoters.length > 0 ? (
        <ul aria-label="Participants without votes" className="vote-group-non-voters">
          {nonVoters.map((participant) => (
            <li key={participant.id}>{participant.displayName} - Not voted</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function groupAccessibleLabel(group: VoteResultGroup): string {
  const status = group.isMajority ? 'Majority' : group.isOutlier ? 'Outlier' : 'Result'

  return `${status}: ${voteCountLabel(group.count)} for ${group.value} by ${group.voters
    .map((voter) => voter.displayName)
    .join(', ')}`
}

function voteCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'vote' : 'votes'}`
}
