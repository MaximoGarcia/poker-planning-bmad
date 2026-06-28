import { randomInt } from 'node:crypto'
import { RoomCodeSchema } from '../../src/shared/schemas/command-schemas.js'

const ROOM_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const DEFAULT_ROOM_CODE_LENGTH = 6
const DEFAULT_MAX_ATTEMPTS = 100

export interface GenerateUniqueRoomCodeOptions {
  isTaken: (roomCode: string) => boolean
  generateCandidate?: () => string
  maxAttempts?: number
}

export function generateRoomCode(length = DEFAULT_ROOM_CODE_LENGTH): string {
  let roomCode = ''

  for (let index = 0; index < length; index += 1) {
    roomCode += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
  }

  return RoomCodeSchema.parse(roomCode)
}

export function generateUniqueRoomCode({
  isTaken,
  generateCandidate = generateRoomCode,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: GenerateUniqueRoomCodeOptions): string {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = RoomCodeSchema.parse(generateCandidate())

    if (!isTaken(candidate)) {
      return candidate
    }
  }

  throw new Error('Unable to generate a unique room code')
}
