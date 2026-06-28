import { describe, expect, it } from 'vitest'
import { RoomCodeSchema } from '../../src/shared/schemas/command-schemas.js'
import { generateRoomCode, generateUniqueRoomCode } from './room-code.js'

describe('room code generation', () => {
  it('generates codes accepted by the shared schema', () => {
    for (let index = 0; index < 100; index += 1) {
      expect(RoomCodeSchema.safeParse(generateRoomCode()).success).toBe(true)
    }
  })

  it('retries until a unique code is available', () => {
    const candidates = ['TAKEN1', 'TAKEN2', 'OPEN42']
    const roomCode = generateUniqueRoomCode({
      isTaken: (candidate) => candidate.startsWith('TAKEN'),
      generateCandidate: () => candidates.shift() ?? 'OPEN42',
    })

    expect(roomCode).toBe('OPEN42')
  })
})
