import { describe, expect, it } from 'vitest'
import { PLANNING_DECKS } from '../domain/decks'
import { CreateSessionResultSchema, JoinSessionResultSchema, SessionSnapshotSchema } from './session-schemas'

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

  it('rejects create results whose snapshot room code differs from the top-level room code', () => {
    expect(
      CreateSessionResultSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'abcdefghijklmnopqrstuvwxyzABCDEF0123456789_-',
        snapshot: {
          ...snapshot,
          roomCode: 'WXYZ99',
        },
      }).success,
    ).toBe(false)
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

  it('validates join acknowledgements with participant tokens', () => {
    const participantSnapshot = {
      ...snapshot,
      participants: [
        ...snapshot.participants,
        {
          id: 'participant-2',
          displayName: 'Ana',
          role: 'participant',
          connected: true,
          hasVoted: false,
        },
      ],
    }

    expect(
      JoinSessionResultSchema.parse({
        roomCode: 'ABCD12',
        participantToken: 'abcdefghijklmnopqrstuvwxyzABCDEF0123456789_-',
        participantId: 'participant-2',
        displayName: 'Ana',
        snapshot: participantSnapshot,
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      participantToken: 'abcdefghijklmnopqrstuvwxyzABCDEF0123456789_-',
      participantId: 'participant-2',
      displayName: 'Ana',
      snapshot: participantSnapshot,
    })
  })

  it('rejects join snapshots with token fields', () => {
    expect(
      JoinSessionResultSchema.safeParse({
        roomCode: 'ABCD12',
        participantToken: 'abcdefghijklmnopqrstuvwxyzABCDEF0123456789_-',
        participantId: 'participant-2',
        displayName: 'Ana',
        snapshot: {
          ...snapshot,
          participantToken: 'abcdefghijklmnopqrstuvwxyzABCDEF0123456789_-',
        },
      }).success,
    ).toBe(false)
  })
})
