const MODERATOR_TOKEN_KEY_PREFIX = 'poker-planning-bmad:moderator-token:'
const PARTICIPANT_TOKEN_KEY_PREFIX = 'poker-planning-bmad:participant-token:'

export function moderatorTokenStorageKey(roomCode: string): string {
  return `${MODERATOR_TOKEN_KEY_PREFIX}${roomCode}`
}

export function saveModeratorToken(roomCode: string, moderatorToken: string): boolean {
  try {
    window.sessionStorage.setItem(moderatorTokenStorageKey(roomCode), moderatorToken)
    return true
  } catch {
    return false
  }
}

export function readModeratorToken(roomCode: string): string | null {
  try {
    return window.sessionStorage.getItem(moderatorTokenStorageKey(roomCode))
  } catch {
    return null
  }
}

export function participantTokenStorageKey(roomCode: string, participantId: string): string {
  return `${PARTICIPANT_TOKEN_KEY_PREFIX}${roomCode}:${participantId}`
}

export function saveParticipantToken(
  roomCode: string,
  participantId: string,
  participantToken: string,
): boolean {
  try {
    window.sessionStorage.setItem(participantTokenStorageKey(roomCode, participantId), participantToken)
    return true
  } catch {
    return false
  }
}

export function readParticipantToken(roomCode: string, participantId: string): string | null {
  try {
    return window.sessionStorage.getItem(participantTokenStorageKey(roomCode, participantId))
  } catch {
    return null
  }
}
