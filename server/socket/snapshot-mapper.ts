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
    deck: session.snapshot.deck,
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
      voteCount: session.snapshot.round.voteCount,
    },
    updatedAt: session.snapshot.updatedAt,
  }
}
