import { describe, expect, it } from 'vitest'
import { PLANNING_DECKS } from '../../src/shared/domain/decks.js'
import { createSession } from './session-commands.js'
import { createSessionStore } from './session-store.js'

describe('createSession', () => {
  it('creates a live moderator session with a token-free snapshot', () => {
    const store = createSessionStore()
    const result = createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'secret-token',
        generateParticipantId: () => 'participant-1',
        now: () => new Date('2026-06-28T16:00:00.000Z'),
      },
    )

    expect(result.roomCode).toBe('ABCD12')
    expect(result.moderatorToken).toBe('secret-token')
    expect(result.snapshot).toEqual({
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
    })
    expect(JSON.stringify(result.snapshot)).not.toContain('secret-token')
    expect(store.get('ABCD12')?.moderatorToken).toBe('secret-token')
  })

  it('stores sessions by unique room code', () => {
    const store = createSessionStore()

    const first = createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ROOM01',
        generateModeratorToken: () => 'token-1',
        generateParticipantId: () => 'participant-1',
      },
    )
    const second = createSession(
      { moderatorName: 'Ana', deckId: 'tshirt' },
      {
        store,
        generateRoomCode: () => 'ROOM02',
        generateModeratorToken: () => 'token-2',
        generateParticipantId: () => 'participant-2',
      },
    )

    expect(store.get(first.roomCode)?.snapshot.roomCode).toBe('ROOM01')
    expect(store.get(second.roomCode)?.snapshot.deck).toBe(PLANNING_DECKS.tshirt)
  })
})
