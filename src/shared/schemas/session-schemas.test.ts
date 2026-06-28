import { describe, expect, it } from 'vitest'
import { PLANNING_DECKS } from '../domain/decks'
import { CreateSessionResultSchema, SessionSnapshotSchema } from './session-schemas'

const snapshot = {
  roomCode: 'ABCD12',
  deck: PLANNING_DECKS.fibonacci,
  story: null,
  participants: [
    {
      id: 'participant-1',
      displayName: 'Maxi',
      role: 'moderator',
      connected: true,
      hasVoted: false,
    },
  ],
  round: {
    active: false,
    revealed: false,
    voteCount: 0,
  },
  updatedAt: '2026-06-28T16:00:00.000Z',
}

describe('session schemas', () => {
  it('validates create-session acknowledgements with moderator tokens', () => {
    expect(
      CreateSessionResultSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'abcdefghijklmnopqrstuvwxyzABCDEF0123456789_-',
        snapshot,
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'abcdefghijklmnopqrstuvwxyzABCDEF0123456789_-',
      snapshot,
    })
  })

  it('keeps session snapshots token-free and strict', () => {
    expect(SessionSnapshotSchema.parse(snapshot)).toEqual(snapshot)
    expect(
      SessionSnapshotSchema.safeParse({
        ...snapshot,
        moderatorToken: 'abcdefghijklmnopqrstuvwxyzABCDEF0123456789_-',
      }).success,
    ).toBe(false)
  })
})
