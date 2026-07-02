import { randomBytes } from 'node:crypto'

const CAPABILITY_TOKEN_BYTES = 32

export function generateCapabilityToken(): string {
  return randomBytes(CAPABILITY_TOKEN_BYTES).toString('base64url')
}

export function generateModeratorToken(): string {
  return generateCapabilityToken()
}

export function generateParticipantToken(): string {
  return generateCapabilityToken()
}
