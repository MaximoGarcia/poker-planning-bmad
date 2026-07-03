import { describe, expect, it } from 'vitest'
import { PLANNING_DECKS } from '../../src/shared/domain/decks.js'
import { ERROR_CODES } from '../../src/shared/contracts/errors.js'
import { createSession, joinSession, selectDeck, updateStory } from './session-commands.js'
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

describe('joinSession', () => {
  it('joins an existing session with a participant token and token-free snapshot', () => {
    const store = createSessionStore()
    const created = createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
        now: () => new Date('2026-07-02T12:00:00.000Z'),
      },
    )

    const result = joinSession(
      { roomCode: created.roomCode, displayName: 'Ana' },
      {
        store,
        generateParticipantToken: () => 'participant-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'participant-1',
        now: () => new Date('2026-07-02T12:01:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: {
        roomCode: 'ABCD12',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        participantId: 'participant-1',
        displayName: 'Ana',
        snapshot: expect.objectContaining({
          roomCode: 'ABCD12',
          deck: PLANNING_DECKS.fibonacci,
          story: null,
          round: { active: false, revealed: false, voteCount: 0 },
          updatedAt: '2026-07-02T12:01:00.000Z',
        }),
      },
    })
    expect(result.ok ? result.data.snapshot.participants : []).toContainEqual({
      id: 'participant-1',
      displayName: 'Ana',
      role: 'participant',
      connected: true,
      hasVoted: false,
    })
    expect(JSON.stringify(result)).not.toContain('moderator-token')
    expect(JSON.stringify(result.ok ? result.data.snapshot : {})).not.toContain('participant-token')
    expect(store.get('ABCD12')?.participantTokens.get('participant-1')).toBe(
      'participant-token-abcdefghijklmnopqrstuvwxyz',
    )
  })

  it('rejects inactive room codes with a stable error', () => {
    const result = joinSession(
      { roomCode: 'NOPE1', displayName: 'Ana' },
      {
        store: createSessionStore(),
        generateParticipantToken: () => 'participant-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'participant-1',
      },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.invalidRoomCode,
        message: 'Room code is invalid or inactive.',
      },
    })
  })

  it('disambiguates duplicate display names without renaming existing participants', () => {
    const store = createSessionStore()
    createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
      },
    )

    joinSession(
      { roomCode: 'ABCD12', displayName: 'Maxi' },
      {
        store,
        generateParticipantToken: () => 'participant-token-1-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'participant-1',
      },
    )
    const second = joinSession(
      { roomCode: 'ABCD12', displayName: 'Maxi' },
      {
        store,
        generateParticipantToken: () => 'participant-token-2-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'participant-2',
      },
    )

    expect(second.ok ? second.data.displayName : '').toBe('Maxi (3)')
    expect(store.get('ABCD12')?.snapshot.participants.map((participant) => participant.displayName)).toEqual([
      'Maxi',
      'Maxi (2)',
      'Maxi (3)',
    ])
  })

  it('preserves existing story, deck, and round state when a participant joins', () => {
    const store = createSessionStore()
    createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
      },
    )
    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      snapshot: {
        ...session.snapshot,
        deck: PLANNING_DECKS.tshirt,
        story: {
          id: 'story-1',
          title: 'Estimate ADR export',
          locked: true,
        },
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      },
    })

    const result = joinSession(
      { roomCode: 'ABCD12', displayName: 'Ana' },
      {
        store,
        generateParticipantToken: () => 'participant-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'participant-1',
      },
    )

    expect(result.ok ? result.data.snapshot.deck : null).toBe(PLANNING_DECKS.tshirt)
    expect(result.ok ? result.data.snapshot.story : null).toEqual({
      id: 'story-1',
      title: 'Estimate ADR export',
      locked: true,
    })
    expect(result.ok ? result.data.snapshot.round : null).toEqual({
      active: true,
      revealed: false,
      voteCount: 1,
    })
  })

  it('keeps suffixed duplicate display names within the validated length', () => {
    const store = createSessionStore()
    const displayName = 'A'.repeat(80)
    createSession(
      { moderatorName: displayName, deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
      },
    )

    const result = joinSession(
      { roomCode: 'ABCD12', displayName },
      {
        store,
        generateParticipantToken: () => 'participant-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'participant-1',
      },
    )

    expect(result.ok ? result.data.displayName : '').toHaveLength(80)
    expect(result.ok ? result.data.displayName : '').toBe(`${'A'.repeat(76)} (2)`)
  })
})

describe('updateStory', () => {
  it('lets the moderator update the active story when no round is running', () => {
    const store = createSessionStore()
    createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
        now: () => new Date('2026-07-02T12:00:00.000Z'),
      },
    )

    const result = updateStory(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      {
        store,
        now: () => new Date('2026-07-02T12:05:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        deck: PLANNING_DECKS.fibonacci,
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: false,
        },
        round: {
          active: false,
          revealed: false,
          voteCount: 0,
        },
        updatedAt: '2026-07-02T12:05:00.000Z',
      }),
    })
  })

  it('rejects invalid moderator tokens with a stable unauthorized error', () => {
    const store = createSessionStore()
    createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
      },
    )

    const result = updateStory(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can update the current story or deck.',
      },
    })
  })

  it('rejects story updates while a round is active without mutating session state', () => {
    const store = createSessionStore()
    createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
      },
    )
    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      votes: new Map([
        ['moderator-1', '8'],
        ['participant-2', '5'],
      ]),
      snapshot: {
        ...session.snapshot,
        story: {
          id: 'ADR-20',
          title: 'Previous story',
          locked: true,
        },
        round: {
          active: true,
          revealed: false,
          voteCount: 2,
        },
      },
    })

    const result = updateStory(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      {
        store,
        now: () => new Date('2026-07-02T12:10:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.storyLocked,
        message: 'The current story and deck cannot change during an active round.',
      },
    })
    expect(store.get('ABCD12')?.snapshot.story).toEqual({
      id: 'ADR-20',
      title: 'Previous story',
      locked: true,
    })
    expect(store.get('ABCD12')?.snapshot.round).toEqual({
      active: true,
      revealed: false,
      voteCount: 2,
    })
    expect(Array.from(store.get('ABCD12')?.votes.entries() ?? [])).toEqual([
      ['moderator-1', '8'],
      ['participant-2', '5'],
    ])
  })
})

describe('selectDeck', () => {
  it('lets the moderator switch the shared planning deck when no round is running', () => {
    const store = createSessionStore()
    createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
        now: () => new Date('2026-07-02T12:00:00.000Z'),
      },
    )
    updateStory(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      },
      {
        store,
        now: () => new Date('2026-07-02T12:05:00.000Z'),
      },
    )

    const result = selectDeck(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        deckId: 'tshirt',
      },
      {
        store,
        now: () => new Date('2026-07-02T12:06:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        deck: PLANNING_DECKS.tshirt,
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: false,
        },
        updatedAt: '2026-07-02T12:06:00.000Z',
      }),
    })
  })

  it('rejects deck changes during an active round without mutating story or votes', () => {
    const store = createSessionStore()
    createSession(
      { moderatorName: 'Maxi', deckId: 'fibonacci' },
      {
        store,
        generateRoomCode: () => 'ABCD12',
        generateModeratorToken: () => 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        generateParticipantId: () => 'moderator-1',
      },
    )
    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      votes: new Map([['participant-2', '3']]),
      snapshot: {
        ...session.snapshot,
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: true,
        },
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
      },
    })

    const result = selectDeck(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        deckId: 'tshirt',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.storyLocked,
        message: 'The current story and deck cannot change during an active round.',
      },
    })
    expect(store.get('ABCD12')?.snapshot.deck).toBe(PLANNING_DECKS.fibonacci)
    expect(store.get('ABCD12')?.snapshot.story).toEqual({
      id: 'ADR-21',
      title: 'Estimate socket moderation flow',
      locked: true,
    })
    expect(Array.from(store.get('ABCD12')?.votes.entries() ?? [])).toEqual([['participant-2', '3']])
  })
})
