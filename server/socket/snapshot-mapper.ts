import type { SessionSnapshot } from '../../src/shared/contracts/snapshots.js'
import type { ParticipantRole } from '../../src/shared/domain/session-types.js'
import type { SessionState } from '../domain/session-store.js'

export type SnapshotViewer = {
  role: ParticipantRole
  participantId: string
}

export function toPreRevealSessionSnapshot(
  session: SessionState,
  viewer: SnapshotViewer,
): SessionSnapshot {
  void viewer

  return {
    roomCode: session.roomCode,
    deck: {
      id: session.snapshot.deck.id,
      label: session.snapshot.deck.label,
      values: [...session.snapshot.deck.values],
    },
    story: session.snapshot.story
      ? {
          id: session.snapshot.story.id,
          title: session.snapshot.story.title,
          locked: session.snapshot.story.locked,
        }
      : null,
    participants: session.snapshot.participants.map((participant) => ({
      id: participant.id,
      displayName: participant.displayName,
      role: participant.role,
      connected: participant.connected,
      hasVoted: participant.hasVoted,
    })),
    round: {
      active: session.snapshot.round.active,
      revealed: session.snapshot.round.revealed,
      voteCount: session.votes.size,
    },
    results: session.snapshot.round.revealed
      ? {
          votes:
            session.snapshot.results?.votes.map((vote) => ({
              participantId: vote.participantId,
              displayName: vote.displayName,
              role: vote.role,
              value: vote.value,
            })) ?? [],
        }
      : null,
    updatedAt: session.snapshot.updatedAt,
  }
}
