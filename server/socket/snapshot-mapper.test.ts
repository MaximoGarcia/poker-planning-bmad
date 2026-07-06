import { describe, expect, it } from 'vitest'
import { PLANNING_DECKS } from '../../src/shared/domain/decks.js'
import type { SessionState } from '../domain/session-store.js'
import { toPreRevealSessionSnapshot } from './snapshot-mapper.js'

describe('toPreRevealSessionSnapshot', () => {
  it('returns a status-only moderator snapshot before reveal', () => {
    const session = createSessionState()

    const snapshot = toPreRevealSessionSnapshot(session, {
      role: 'moderator',
      participantId: 'moderator-1',
    })

    expect(snapshot).toEqual({
      roomCode: 'ABCD12',
      deck: PLANNING_DECKS.fibonacci,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      participants: [
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
          hasVoted: true,
        },
        {
          id: 'participant-3',
          displayName: 'Lee',
          role: 'participant',
          connected: true,
          hasVoted: true,
        },
      ],
      round: {
        active: true,
        revealed: false,
        voteCount: 3,
      },
      results: null,
      estimatedStories: [],
      updatedAt: '2026-07-03T13:00:00.000Z',
    })
    expect(snapshot).not.toHaveProperty('votes')
    expect(snapshot.results).toBeNull()
    expect(snapshot).not.toHaveProperty('groupedResults')
    expect(snapshot.participants[0]).not.toHaveProperty('selectedCard')
    expect(snapshot.participants[1]).not.toHaveProperty('selectedCard')
    expect(snapshot.participants[2]).not.toHaveProperty('selectedCard')
  })

  it('does not expose another participant selected card to a participant viewer', () => {
    const session = createSessionState()

    const snapshot = toPreRevealSessionSnapshot(session, {
      role: 'participant',
      participantId: 'participant-2',
    })

    expect(snapshot.participants).toEqual([
      expect.objectContaining({ id: 'moderator-1', hasVoted: true }),
      expect.objectContaining({ id: 'participant-2', hasVoted: true }),
      expect.objectContaining({ id: 'participant-3', hasVoted: true }),
    ])
    expect(snapshot.participants[0]).not.toHaveProperty('selectedCard')
    expect(snapshot.participants[1]).not.toHaveProperty('selectedCard')
    expect(snapshot.participants[2]).not.toHaveProperty('selectedCard')
    expect(snapshot).not.toHaveProperty('votes')
    expect(snapshot.results).toBeNull()
    expect(snapshot).not.toHaveProperty('groupedResults')
  })

  it('drops sensitive and moderator-only fields from malformed session state', () => {
    const session = createSessionState()
    const unsafeSession = {
      ...session,
      snapshot: {
        ...session.snapshot,
        deck: {
          ...session.snapshot.deck,
          hiddenMetadata: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        },
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        votes: { 'participant-2': '8' },
        results: { '8': 1 },
        groupedResults: [{ value: '8', count: 1 }],
        estimatedStories: [
          {
            storyId: 'ADR-20',
            title: 'Previous estimated story',
            deck: PLANNING_DECKS.fibonacci,
            finalEstimate: '8',
          },
        ],
        participants: session.snapshot.participants.map((participant) => ({
          ...participant,
          selectedCard: session.votes.get(participant.id) ?? null,
          token: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        })),
        round: {
          ...session.snapshot.round,
          distribution: { '8': 1, '13': 1 },
        },
      },
      estimatedStories: [
        {
          storyId: 'ADR-20',
          title: 'Previous estimated story',
          deck: PLANNING_DECKS.fibonacci,
          finalEstimate: '8',
        },
      ],
    } as unknown as SessionState

    const snapshot = toPreRevealSessionSnapshot(unsafeSession, {
      role: 'participant',
      participantId: 'participant-2',
    })
    const serialized = JSON.stringify(snapshot)

    expect(snapshot).not.toHaveProperty('moderatorToken')
    expect(snapshot).not.toHaveProperty('participantToken')
    expect(snapshot).not.toHaveProperty('votes')
    expect(snapshot.results).toBeNull()
    expect(snapshot).not.toHaveProperty('groupedResults')
    expect(snapshot).not.toHaveProperty('estimatedStories')
    expect(snapshot.deck).toEqual(PLANNING_DECKS.fibonacci)
    expect(snapshot.deck).not.toHaveProperty('hiddenMetadata')
    expect(snapshot.round).not.toHaveProperty('distribution')
    expect(snapshot.round.voteCount).toBe(3)
    expect(serialized).not.toContain('moderator-token')
    expect(serialized).not.toContain('participant-token')
    expect(serialized).not.toContain('selectedCard')
    expect(serialized).not.toContain('"8":')
    expect(serialized).not.toContain('"13":')
  })

  it('returns explicit flat results only after reveal', () => {
    const session = createSessionState()
    const snapshot = toPreRevealSessionSnapshot(
      {
        ...session,
        snapshot: {
          ...session.snapshot,
          participants: [
            ...session.snapshot.participants,
            {
              id: 'participant-4',
              displayName: 'No Vote',
              role: 'participant',
              connected: true,
              hasVoted: false,
            },
          ],
          round: {
            active: true,
            revealed: true,
            voteCount: 3,
          },
          results: {
            votes: [
              {
                participantId: 'moderator-1',
                displayName: 'Maxi',
                role: 'moderator',
                value: '13',
              },
              {
                participantId: 'participant-2',
                displayName: 'Ana',
                role: 'participant',
                value: '8',
              },
              {
                participantId: 'participant-3',
                displayName: 'Lee',
                role: 'participant',
                value: '5',
              },
            ],
          },
        },
      },
      {
        role: 'participant',
        participantId: 'participant-2',
      },
    )

    expect(snapshot.results).toEqual({
      votes: [
        {
          participantId: 'moderator-1',
          displayName: 'Maxi',
          role: 'moderator',
          value: '13',
        },
        {
          participantId: 'participant-2',
          displayName: 'Ana',
          role: 'participant',
          value: '8',
        },
        {
          participantId: 'participant-3',
          displayName: 'Lee',
          role: 'participant',
          value: '5',
        },
      ],
    })
    expect(snapshot.results?.votes).not.toContainEqual(
      expect.objectContaining({ participantId: 'participant-4' }),
    )
    expect(snapshot).not.toHaveProperty('groupedResults')
  })

  it('includes estimated stories only for moderator viewers', () => {
    const session = {
      ...createSessionState(),
      estimatedStories: [
        {
          storyId: 'ADR-21',
          title: 'Estimate socket moderation flow',
          deck: PLANNING_DECKS.fibonacci,
          finalEstimate: '8',
        },
      ],
    }

    expect(
      toPreRevealSessionSnapshot(session, {
        role: 'moderator',
        participantId: 'moderator-1',
      }).estimatedStories,
    ).toEqual([
      {
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
        deck: PLANNING_DECKS.fibonacci,
        finalEstimate: '8',
      },
    ])
    expect(
      toPreRevealSessionSnapshot(session, {
        role: 'participant',
        participantId: 'participant-2',
      }),
    ).not.toHaveProperty('estimatedStories')
  })
})

function createSessionState(): SessionState {
  return {
    roomCode: 'ABCD12',
    moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
    moderatorParticipantId: 'moderator-1',
    participantTokens: new Map([
      ['participant-2', 'participant-token-2-abcdefghijklmnopqrstuvwxyz'],
      ['participant-3', 'participant-token-3-abcdefghijklmnopqrstuvwxyz'],
    ]),
    votes: new Map([
      ['moderator-1', '13'],
      ['participant-2', '8'],
      ['participant-3', '5'],
    ]),
    estimatedStories: [],
    snapshot: {
      roomCode: 'ABCD12',
      deck: PLANNING_DECKS.fibonacci,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: true,
      },
      participants: [
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
          hasVoted: true,
        },
        {
          id: 'participant-3',
          displayName: 'Lee',
          role: 'participant',
          connected: true,
          hasVoted: true,
        },
      ],
      round: {
        active: true,
        revealed: false,
        voteCount: 3,
      },
      results: null,
      updatedAt: '2026-07-03T13:00:00.000Z',
    },
  }
}
