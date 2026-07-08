import { describe, expect, it } from 'vitest'
import { PLANNING_DECKS } from '../../src/shared/domain/decks.js'
import { ERROR_CODES } from '../../src/shared/contracts/errors.js'
import {
  advanceStory,
  createSession,
  joinSession,
  recordEstimate,
  resetRound,
  revealRound,
  selectDeck,
  startRound,
  submitVote,
  updateStory,
} from './session-commands.js'
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
      results: null,
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

describe('startRound', () => {
  it('starts a round, locks the story, clears votes, and resets vote status', () => {
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
    joinSession(
      { roomCode: 'ABCD12', displayName: 'Ana' },
      {
        store,
        generateParticipantId: () => 'participant-2',
        generateParticipantToken: () => 'participant-token-abcdefghijklmnopqrstuvwxyz',
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
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: false,
        },
        participants: session.snapshot.participants.map((participant) => ({
          ...participant,
          hasVoted: true,
        })),
        round: {
          active: false,
          revealed: true,
          voteCount: 2,
        },
        updatedAt: '2026-07-02T12:02:00.000Z',
      },
    })

    const result = startRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      {
        store,
        now: () => new Date('2026-07-02T12:10:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        story: {
          id: 'ADR-21',
          title: 'Estimate socket moderation flow',
          locked: true,
        },
        round: {
          active: true,
          revealed: false,
          voteCount: 0,
        },
        updatedAt: '2026-07-02T12:10:00.000Z',
      }),
    })
    expect(result.ok ? result.data.participants : []).toEqual([
      {
        id: 'moderator-1',
        displayName: 'Maxi',
        role: 'moderator',
        connected: true,
        hasVoted: false,
      },
      {
        id: 'participant-2',
        displayName: 'Ana',
        role: 'participant',
        connected: true,
        hasVoted: false,
      },
    ])
    expect(store.get('ABCD12')?.votes.size).toBe(0)
  })

  it('returns invalid room code for missing sessions', () => {
    const result = startRound(
      {
        roomCode: 'NOPE1',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store: createSessionStore() },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.invalidRoomCode,
        message: 'Room code is invalid or inactive.',
      },
    })
  })

  it('returns unauthorized for invalid moderator tokens without mutation', () => {
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
    const before = store.get('ABCD12')

    const result = startRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
      },
      {
        store,
        now: () => new Date('2026-07-02T12:10:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can start a voting round.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('requires a current story and leaves session state unchanged on failure', () => {
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
    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      votes: new Map([['moderator-1', '8']]),
      snapshot: {
        ...session.snapshot,
        round: {
          active: false,
          revealed: false,
          voteCount: 1,
        },
        updatedAt: '2026-07-02T12:02:00.000Z',
      },
    })
    const before = store.get('ABCD12')

    const result = startRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      {
        store,
        now: () => new Date('2026-07-02T12:10:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.storyRequired,
        message: 'Choose a current story before starting a voting round.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })
})

describe('submitVote', () => {
  it('records a participant first vote, marks only that participant voted, and recomputes vote count', () => {
    const { store } = createActiveVotingSession()

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      {
        store,
        now: () => new Date('2026-07-03T13:00:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
        updatedAt: '2026-07-03T13:00:00.000Z',
      }),
    })
    expect(result.ok ? result.data.participants : []).toEqual([
      {
        id: 'moderator-1',
        displayName: 'Maxi',
        role: 'moderator',
        connected: true,
        hasVoted: false,
      },
      {
        id: 'participant-2',
        displayName: 'Ana',
        role: 'participant',
        connected: true,
        hasVoted: true,
      },
    ])
    expect(Array.from(store.get('ABCD12')?.votes.entries() ?? [])).toEqual([
      ['participant-2', '8'],
    ])
    expect(JSON.stringify(result.ok ? result.data : {})).not.toContain('participant-token')
    expect(result.ok ? result.data : {}).not.toHaveProperty('selectedCard')
    expect(result.ok ? result.data.participants[1] : {}).not.toHaveProperty('selectedCard')
  })

  it('replaces a participant changed vote without increasing vote count', () => {
    const { store } = createActiveVotingSession()

    submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '3',
      },
      { store },
    )
    const result = submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '5',
      },
      { store },
    )

    expect(result.ok ? result.data.round.voteCount : 0).toBe(1)
    expect(Array.from(store.get('ABCD12')?.votes.entries() ?? [])).toEqual([
      ['participant-2', '5'],
    ])
  })

  it('records a moderator first vote, marks only the moderator voted, and keeps the card hidden', () => {
    const { store } = createActiveVotingSession()

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
      },
      {
        store,
        now: () => new Date('2026-07-03T13:05:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        round: {
          active: true,
          revealed: false,
          voteCount: 1,
        },
        updatedAt: '2026-07-03T13:05:00.000Z',
      }),
    })
    expect(result.ok ? result.data.participants : []).toEqual([
      {
        id: 'moderator-1',
        displayName: 'Maxi',
        role: 'moderator',
        connected: true,
        hasVoted: true,
      },
      {
        id: 'participant-2',
        displayName: 'Ana',
        role: 'participant',
        connected: true,
        hasVoted: false,
      },
    ])
    expect(Array.from(store.get('ABCD12')?.votes.entries() ?? [])).toEqual([
      ['moderator-1', '13'],
    ])
    expect(JSON.stringify(result.ok ? result.data : {})).not.toContain(
      'moderator-token-abcdefghijklmnopqrstuvwxyz',
    )
    expect(result.ok ? result.data : {}).not.toHaveProperty('selectedCard')
    expect(result.ok ? result.data : {}).not.toHaveProperty('votes')
    expect(result.ok ? result.data.results : undefined).toBeNull()
    expect(result.ok ? result.data.participants[0] : {}).not.toHaveProperty('selectedCard')
  })

  it('replaces a moderator changed vote without increasing vote count', () => {
    const { store } = createActiveVotingSession()

    submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )
    const result = submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
      },
      { store },
    )

    expect(result.ok ? result.data.round.voteCount : 0).toBe(1)
    expect(Array.from(store.get('ABCD12')?.votes.entries() ?? [])).toEqual([
      ['moderator-1', '13'],
    ])
  })

  it('counts one participant vote and one moderator vote in the same active round', () => {
    const { store } = createActiveVotingSession()

    submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '5',
      },
      { store },
    )
    const result = submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )

    expect(result.ok ? result.data.round.voteCount : 0).toBe(2)
    expect(result.ok ? result.data.participants.map(({ id, hasVoted }) => ({ id, hasVoted })) : []).toEqual([
      { id: 'moderator-1', hasVoted: true },
      { id: 'participant-2', hasVoted: true },
    ])
    expect(Array.from(store.get('ABCD12')?.votes.entries() ?? [])).toEqual([
      ['participant-2', '5'],
      ['moderator-1', '8'],
    ])
  })

  it('returns invalid room code for missing sessions', () => {
    const result = submitVote(
      {
        roomCode: 'NOPE1',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store: createSessionStore() },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.invalidRoomCode,
        message: 'Room code is invalid or inactive.',
      },
    })
  })

  it('returns unauthorized for unknown participants, moderator ids, and bad participant tokens', () => {
    const { store } = createActiveVotingSession()
    const commands = [
      {
        roomCode: 'ABCD12',
        participantId: 'participant-missing',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      {
        roomCode: 'ABCD12',
        participantId: 'moderator-1',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-bad-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
    ]

    for (const command of commands) {
      expect(submitVote(command, { store })).toEqual({
        ok: false,
        error: {
          code: ERROR_CODES.unauthorized,
          message: 'Only the participant can submit their vote.',
        },
      })
    }
    expect(store.get('ABCD12')?.votes.size).toBe(0)
  })

  it('returns unauthorized for bad moderator tokens and participant-token misuse without mutation', () => {
    const { store } = createActiveVotingSession()
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can submit their vote.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('returns unauthorized for moderator votes when the moderator participant entry is missing', () => {
    const { store } = createActiveVotingSession()
    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      snapshot: {
        ...session.snapshot,
        participants: session.snapshot.participants.filter(
          (participant) => participant.id !== session.moderatorParticipantId,
        ),
      },
    })
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can submit their vote.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('returns ROUND_NOT_ACTIVE when no round is active without mutating state', () => {
    const { store } = createActiveVotingSession({ active: false })
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.roundNotActive,
        message: 'Voting is not active for this session.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('returns ROUND_NOT_ACTIVE for moderator votes when no round is active without mutating state', () => {
    const { store } = createActiveVotingSession({ active: false })
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.roundNotActive,
        message: 'Voting is not active for this session.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('returns VOTE_LOCKED when the round is revealed without mutating state', () => {
    const { store } = createActiveVotingSession({ revealed: true })
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.voteLocked,
        message: 'Votes are locked for this round.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('returns VOTE_LOCKED for moderator votes when the round is revealed without mutating state', () => {
    const { store } = createActiveVotingSession({ revealed: true })
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.voteLocked,
        message: 'Votes are locked for this round.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('returns validation failed for values outside the active deck without mutating state', () => {
    const { store } = createActiveVotingSession()
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: 'XXL',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Vote value is not part of the active deck.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('returns validation failed for moderator values outside the active deck without mutating state', () => {
    const { store } = createActiveVotingSession()
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: 'XXL',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Vote value is not part of the active deck.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })
})

describe('revealRound', () => {
  it('reveals submitted votes, leaves non-voters value-less, and keeps the round active', () => {
    const { store } = createActiveVotingSession()
    joinSession(
      { roomCode: 'ABCD12', displayName: 'Lee' },
      {
        store,
        generateParticipantId: () => 'participant-3',
        generateParticipantToken: () => 'participant-token-3-abcdefghijklmnopqrstuvwxyz',
      },
    )
    submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )

    const result = revealRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      {
        store,
        now: () => new Date('2026-07-03T13:30:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        roomCode: 'ABCD12',
        round: {
          active: true,
          revealed: true,
          voteCount: 1,
        },
        results: {
          votes: [
            {
              participantId: 'participant-2',
              displayName: 'Ana',
              role: 'participant',
              value: '8',
            },
          ],
        },
        updatedAt: '2026-07-03T13:30:00.000Z',
      }),
    })
    expect(result.ok ? result.data.participants : []).toContainEqual({
      id: 'participant-3',
      displayName: 'Lee',
      role: 'participant',
      connected: true,
      hasVoted: false,
    })
    expect(Array.from(store.get('ABCD12')?.votes.entries() ?? [])).toEqual([
      ['participant-2', '8'],
    ])
  })

  it('does not fabricate a moderator vote when the moderator has not voted', () => {
    const { store } = createActiveVotingSession()
    submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '5',
      },
      { store },
    )

    const result = revealRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store },
    )

    expect(result.ok ? result.data.results?.votes : []).toEqual([
      {
        participantId: 'participant-2',
        displayName: 'Ana',
        role: 'participant',
        value: '5',
      },
    ])
  })

  it('includes a submitted moderator vote using the moderator participant identity', () => {
    const { store } = createActiveVotingSession()
    submitVote(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
      },
      { store },
    )

    const result = revealRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store },
    )

    expect(result.ok ? result.data.results?.votes : []).toEqual([
      {
        participantId: 'moderator-1',
        displayName: 'Maxi',
        role: 'moderator',
        value: '13',
      },
    ])
  })

  it('returns stable failures for invalid room, invalid token, and inactive rounds without mutation', () => {
    const missingRoom = revealRound(
      {
        roomCode: 'NOPE1',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store: createSessionStore() },
    )
    expect(missingRoom).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.invalidRoomCode,
        message: 'Room code is invalid or inactive.',
      },
    })

    const { store } = createActiveVotingSession({ active: false })
    const before = store.get('ABCD12')
    expect(
      revealRound(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can reveal round results.',
      },
    })
    expect(
      revealRound(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.roundNotActive,
        message: 'Voting is not active for this session.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('is idempotent after the round has already been revealed', () => {
    const { store } = createActiveVotingSession()
    submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )
    const first = revealRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      {
        store,
        now: () => new Date('2026-07-03T13:30:00.000Z'),
      },
    )
    const second = revealRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      {
        store,
        now: () => new Date('2026-07-03T13:31:00.000Z'),
      },
    )

    expect(second).toEqual(first)
    expect(first.ok ? first.data.results?.votes : []).toHaveLength(1)
  })

  it('locks post-reveal vote changes without mutating revealed results', () => {
    const { store } = createActiveVotingSession()
    submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )
    revealRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store },
    )
    const before = store.get('ABCD12')

    const result = submitVote(
      {
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.voteLocked,
        message: 'Votes are locked for this round.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })
})

describe('recordEstimate', () => {
  it('records a valid final estimate after reveal and updates the timestamp', () => {
    const { store } = createActiveVotingSession({ revealed: true })

    const result = recordEstimate(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      {
        store,
        now: () => new Date('2026-07-04T10:00:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        updatedAt: '2026-07-04T10:00:00.000Z',
      }),
    })
    expect(store.get('ABCD12')?.estimatedStories).toEqual([
      {
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
        deck: PLANNING_DECKS.fibonacci,
        finalEstimate: '8',
      },
    ])
  })

  it('rejects invalid deck values without changing an existing estimate', () => {
    const { store } = createActiveVotingSession({ revealed: true })
    recordEstimate(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )
    const before = store.get('ABCD12')

    const result = recordEstimate(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: 'custom',
      },
      { store },
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.validationFailed,
        message: 'Final estimate must be one of the active deck cards.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('rejects pre-reveal and unauthorized attempts with stable errors', () => {
    const { store } = createActiveVotingSession()

    expect(
      recordEstimate(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
          value: '8',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.resultsNotRevealed,
        message: 'Reveal results before recording a final estimate.',
      },
    })
    expect(
      recordEstimate(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
          value: '8',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can record a final estimate.',
      },
    })
  })

  it('upserts by story id and preserves estimates for other stories', () => {
    const { store } = createActiveVotingSession({ revealed: true })

    recordEstimate(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      },
      { store },
    )
    recordEstimate(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
      },
      { store },
    )
    const session = store.get('ABCD12')

    if (!session) {
      throw new Error('Expected session to exist')
    }

    store.set({
      ...session,
      snapshot: {
        ...session.snapshot,
        story: {
          id: 'ADR-22',
          title: 'Second estimated story',
          locked: true,
        },
      },
    })
    recordEstimate(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '5',
      },
      { store },
    )

    expect(store.get('ABCD12')?.estimatedStories).toEqual([
      expect.objectContaining({
        storyId: 'ADR-21',
        finalEstimate: '13',
      }),
      expect.objectContaining({
        storyId: 'ADR-22',
        finalEstimate: '5',
      }),
    ])
  })
})

describe('resetRound', () => {
  it('clears votes and results, unlocks the story, and preserves deck plus estimate history', () => {
    const { store } = createEstimatedRevealedSession()

    const result = resetRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      {
        store,
        now: () => new Date('2026-07-05T10:00:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
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
        results: null,
        updatedAt: '2026-07-05T10:00:00.000Z',
      }),
    })
    expect(store.get('ABCD12')?.votes.size).toBe(0)
    expect(store.get('ABCD12')?.snapshot.participants.every((participant) => !participant.hasVoted)).toBe(true)
    expect(store.get('ABCD12')?.snapshot.deck).toBe(PLANNING_DECKS.fibonacci)
    expect(store.get('ABCD12')?.estimatedStories).toEqual([
      expect.objectContaining({
        storyId: 'ADR-21',
        finalEstimate: '8',
      }),
    ])
  })

  it('returns stable failures for inactive rounds and unauthorized attempts without mutation', () => {
    const { store } = createEstimatedRevealedSession()
    resetRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store },
    )
    const before = store.get('ABCD12')

    expect(
      resetRound(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can reset a voting round.',
      },
    })
    expect(
      resetRound(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.roundNotActive,
        message: 'Voting is not active for this session.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })
})

describe('advanceStory', () => {
  it('clears the active story and round while preserving deck and estimated stories', () => {
    const { store } = createEstimatedRevealedSession()

    const result = advanceStory(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      {
        store,
        now: () => new Date('2026-07-05T10:05:00.000Z'),
      },
    )

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        story: null,
        round: {
          active: false,
          revealed: false,
          voteCount: 0,
        },
        results: null,
        updatedAt: '2026-07-05T10:05:00.000Z',
      }),
    })
    expect(store.get('ABCD12')?.snapshot.deck).toBe(PLANNING_DECKS.fibonacci)
    expect(store.get('ABCD12')?.estimatedStories).toEqual([
      expect.objectContaining({
        storyId: 'ADR-21',
        finalEstimate: '8',
      }),
    ])
  })

  it('requires a recorded estimate and rejects participant or bad-token attempts without mutation', () => {
    const { store } = createActiveVotingSession({ revealed: true })
    const before = store.get('ABCD12')

    expect(
      advanceStory(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.finalEstimateRequired,
        message: 'Record a final estimate before advancing to the next story.',
      },
    })
    expect(
      advanceStory(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.unauthorized,
        message: 'Only the moderator can advance to the next story.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })

  it('requires a fresh estimate after reset even when estimate history for the story exists', () => {
    const { store } = createEstimatedRevealedSession()

    resetRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store },
    )
    startRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store },
    )
    revealRound(
      {
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      },
      { store },
    )
    const before = store.get('ABCD12')

    expect(
      advanceStory(
        {
          roomCode: 'ABCD12',
          moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        },
        { store },
      ),
    ).toEqual({
      ok: false,
      error: {
        code: ERROR_CODES.finalEstimateRequired,
        message: 'Record a final estimate before advancing to the next story.',
      },
    })
    expect(store.get('ABCD12')).toEqual(before)
  })
})

function createActiveVotingSession({
  active = true,
  revealed = false,
}: {
  active?: boolean
  revealed?: boolean
} = {}) {
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
    { roomCode: 'ABCD12', displayName: 'Ana' },
    {
      store,
      generateParticipantId: () => 'participant-2',
      generateParticipantToken: () => 'participant-token-abcdefghijklmnopqrstuvwxyz',
    },
  )
  updateStory(
    {
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      storyId: 'ADR-21',
      title: 'Estimate socket moderation flow',
    },
    { store },
  )
  startRound(
    {
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
    },
    { store },
  )
  const session = store.get('ABCD12')

  if (!session) {
    throw new Error('Expected session to exist')
  }

  store.set({
    ...session,
    snapshot: {
      ...session.snapshot,
      round: {
        active,
        revealed,
        voteCount: 0,
      },
    },
  })

  return { store }
}

function createEstimatedRevealedSession() {
  const { store } = createActiveVotingSession()
  submitVote(
    {
      roomCode: 'ABCD12',
      participantId: 'participant-2',
      participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
      value: '8',
    },
    { store },
  )
  submitVote(
    {
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      value: '13',
    },
    { store },
  )
  revealRound(
    {
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
    },
    { store },
  )
  recordEstimate(
    {
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      value: '8',
    },
    { store },
  )

  return { store }
}
