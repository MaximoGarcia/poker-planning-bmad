export const ERROR_CODES = {
  validationFailed: 'VALIDATION_FAILED',
  rateLimited: 'RATE_LIMITED',
  connectionUnavailable: 'CONNECTION_UNAVAILABLE',
  sessionCreateFailed: 'SESSION_CREATE_FAILED',
  invalidRoomCode: 'INVALID_ROOM_CODE',
  unauthorized: 'UNAUTHORIZED',
  roundNotActive: 'ROUND_NOT_ACTIVE',
  voteLocked: 'VOTE_LOCKED',
  storyLocked: 'STORY_LOCKED',
  notImplemented: 'NOT_IMPLEMENTED',
  clientBuildNotFound: 'CLIENT_BUILD_NOT_FOUND',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
