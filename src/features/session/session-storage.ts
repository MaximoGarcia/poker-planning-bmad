const MODERATOR_TOKEN_KEY_PREFIX = 'adr-buddy:moderator-token:'

export function moderatorTokenStorageKey(roomCode: string): string {
  return `${MODERATOR_TOKEN_KEY_PREFIX}${roomCode}`
}

export function saveModeratorToken(roomCode: string, moderatorToken: string): void {
  window.sessionStorage.setItem(moderatorTokenStorageKey(roomCode), moderatorToken)
}

export function readModeratorToken(roomCode: string): string | null {
  return window.sessionStorage.getItem(moderatorTokenStorageKey(roomCode))
}
