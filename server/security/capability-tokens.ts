import { randomBytes } from 'node:crypto'

const MODERATOR_TOKEN_BYTES = 32

export function generateModeratorToken(): string {
  return randomBytes(MODERATOR_TOKEN_BYTES).toString('base64url')
}
