import { createFailureAck, createSuccessAck } from '../contracts/ack'
import { ERROR_CODES } from '../contracts/errors'
import { CLIENT_EVENTS, SERVER_EVENTS } from '../contracts/socket-events'
import { PLANNING_DECKS } from '../domain/decks'
import {
  AdvanceStoryCommandSchema,
  CreateSessionCommandSchema,
  JoinSessionCommandSchema,
  RecordEstimateCommandSchema,
  RoundResetCommandSchema,
  SelectDeckCommandSchema,
  RevealRoundCommandSchema,
  StartRoundCommandSchema,
  SubmitVoteCommandSchema,
  UpdateStoryCommandSchema,
} from './command-schemas'
import { SessionSnapshotAckSchema } from './session-schemas'

describe('shared contracts and schemas', () => {
  it('uses a single acknowledgement shape', () => {
    expect(createSuccessAck({ roomCode: 'ABC123' })).toEqual({
      ok: true,
      data: { roomCode: 'ABC123' },
    })
    expect(createFailureAck({ code: ERROR_CODES.invalidRoomCode, message: 'Invalid room code' })).toEqual({
      ok: false,
      error: { code: 'INVALID_ROOM_CODE', message: 'Invalid room code' },
    })
  })

  it('exports stable create-session error codes', () => {
    expect(ERROR_CODES.validationFailed).toBe('VALIDATION_FAILED')
    expect(ERROR_CODES.rateLimited).toBe('RATE_LIMITED')
    expect(ERROR_CODES.storyRequired).toBe('STORY_REQUIRED')
    expect(ERROR_CODES.finalEstimateRequired).toBe('FINAL_ESTIMATE_REQUIRED')
  })

  it('exports stable session event names', () => {
    expect(CLIENT_EVENTS.sessionCreate).toBe('session:create')
    expect(CLIENT_EVENTS.voteSubmit).toBe('vote:submit')
    expect(SERVER_EVENTS.sessionSnapshot).toBe('session:snapshot')
  })

  it('validates seed command data with shared deck definitions', () => {
    expect(PLANNING_DECKS.fibonacci.values).toContain('Coffee')
    expect(PLANNING_DECKS.tshirt.values).toEqual(['XS', 'S', 'M', 'L', 'XL'])

    expect(CreateSessionCommandSchema.parse({ moderatorName: 'Maxi' })).toEqual({
      moderatorName: 'Maxi',
      deckId: 'fibonacci',
    })
    expect(JoinSessionCommandSchema.safeParse({ roomCode: 'abc', displayName: 'Ana' }).success).toBe(false)
  })

  it('validates moderator story and deck commands with shared schemas', () => {
    expect(
      UpdateStoryCommandSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      storyId: 'ADR-21',
      title: 'Estimate socket moderation flow',
    })

    expect(
      SelectDeckCommandSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        deckId: 'tshirt',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      deckId: 'tshirt',
    })

    expect(
      UpdateStoryCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator token with spaces ################',
        storyId: 'ADR-21',
        title: 'Estimate socket moderation flow',
      }).success,
    ).toBe(false)
  })

  it('validates moderator round-start commands with shared schemas', () => {
    expect(
      StartRoundCommandSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
    })

    expect(
      StartRoundCommandSchema.safeParse({
        roomCode: 'ABCD12',
      }).success,
    ).toBe(false)
    expect(
      StartRoundCommandSchema.safeParse({
        roomCode: 'abc',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }).success,
    ).toBe(false)
  })

  it('validates moderator round-reveal commands with shared schemas', () => {
    expect(
      RevealRoundCommandSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
    })

    expect(
      RevealRoundCommandSchema.safeParse({
        roomCode: 'ABCD12',
      }).success,
    ).toBe(false)
    expect(
      RevealRoundCommandSchema.safeParse({
        roomCode: 'abc',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }).success,
    ).toBe(false)
    expect(
      RevealRoundCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'short',
      }).success,
    ).toBe(false)
    expect(
      RevealRoundCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        extra: true,
      }).success,
    ).toBe(false)
  })

  it('validates moderator round-reset and story-advance commands with strict payloads', () => {
    expect(
      RoundResetCommandSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
    })

    expect(
      AdvanceStoryCommandSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
    })

    expect(
      RoundResetCommandSchema.safeParse({
        roomCode: 'ABCD12',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
      }).success,
    ).toBe(false)
    expect(
      AdvanceStoryCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        extra: true,
      }).success,
    ).toBe(false)
  })

  it('validates participant vote commands with participant identity and token', () => {
    expect(
      SubmitVoteCommandSchema.parse({
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      participantId: 'participant-2',
      participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
      value: '8',
    })

    expect(
      SubmitVoteCommandSchema.safeParse({
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        value: '8',
      }).success,
    ).toBe(false)
    expect(
      SubmitVoteCommandSchema.safeParse({
        roomCode: 'abc',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      }).success,
    ).toBe(false)
    expect(
      SubmitVoteCommandSchema.safeParse({
        roomCode: 'ABCD12',
        participantId: 'participant-2',
        participantToken: 'participant-token-abcdefghijklmnopqrstuvwxyz',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '8',
      }).success,
    ).toBe(false)
  })

  it('validates moderator vote commands with the moderator token only', () => {
    expect(
      SubmitVoteCommandSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      value: '13',
    })

    expect(
      SubmitVoteCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'short',
        value: '13',
      }).success,
    ).toBe(false)
    expect(
      SubmitVoteCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      }).success,
    ).toBe(false)
    expect(
      SubmitVoteCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        participantId: 'participant-2',
        value: '13',
      }).success,
    ).toBe(false)
    expect(
      SubmitVoteCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
        extra: true,
      }).success,
    ).toBe(false)
  })

  it('validates final estimate commands with strict moderator-only payloads', () => {
    expect(
      RecordEstimateCommandSchema.parse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
      }),
    ).toEqual({
      roomCode: 'ABCD12',
      moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
      value: '13',
    })

    expect(
      RecordEstimateCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        estimate: '13',
      }).success,
    ).toBe(false)
    expect(
      RecordEstimateCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: 'x'.repeat(41),
      }).success,
    ).toBe(false)
    expect(
      RecordEstimateCommandSchema.safeParse({
        roomCode: 'ABCD12',
        moderatorToken: 'moderator-token-abcdefghijklmnopqrstuvwxyz',
        value: '13',
        extra: true,
      }).success,
    ).toBe(false)
  })

  it('validates snapshot acknowledgements for moderator commands', () => {
    const snapshot = SessionSnapshotAckSchema.parse({
      roomCode: 'ABCD12',
      deck: PLANNING_DECKS.tshirt,
      story: {
        id: 'ADR-21',
        title: 'Estimate socket moderation flow',
        locked: false,
      },
      participants: [
        {
          id: 'moderator-1',
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
      updatedAt: '2026-07-02T12:00:00.000Z',
    })

    expect(snapshot.story?.id).toBe('ADR-21')
    expect(snapshot.deck.values).toEqual(['XS', 'S', 'M', 'L', 'XL'])
  })

  it('validates post-reveal result snapshots without selected-card participant fields', () => {
    const snapshot = SessionSnapshotAckSchema.parse({
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
          hasVoted: false,
        },
        {
          id: 'participant-2',
          displayName: 'Ana',
          role: 'participant',
          connected: true,
          hasVoted: true,
        },
      ],
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
      estimatedStories: [
        {
          storyId: 'ADR-21',
          title: 'Estimate socket moderation flow',
          deck: PLANNING_DECKS.fibonacci,
          finalEstimate: '8',
        },
      ],
      updatedAt: '2026-07-03T13:00:00.000Z',
    })

    expect(snapshot.results?.votes).toEqual([
      {
        participantId: 'participant-2',
        displayName: 'Ana',
        role: 'participant',
        value: '8',
      },
    ])
    expect(snapshot.estimatedStories?.[0]?.finalEstimate).toBe('8')
    expect(snapshot.participants[1]).not.toHaveProperty('selectedCard')
  })
})
