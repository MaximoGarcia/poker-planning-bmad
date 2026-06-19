import { createFailureAck, createSuccessAck } from '../contracts/ack'
import { ERROR_CODES } from '../contracts/errors'
import { CLIENT_EVENTS, SERVER_EVENTS } from '../contracts/socket-events'
import { PLANNING_DECKS } from '../domain/decks'
import { CreateSessionCommandSchema, JoinSessionCommandSchema } from './command-schemas'

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
})
