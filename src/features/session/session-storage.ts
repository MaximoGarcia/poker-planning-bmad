const MODERATOR_TOKEN_KEY_PREFIX = 'adr-buddy:moderator-token:'

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
