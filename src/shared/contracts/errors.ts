export const ERROR_CODES = {
  validationFailed: 'VALIDATION_FAILED',
  rateLimited: 'RATE_LIMITED',
  connectionUnavailable: 'CONNECTION_UNAVAILABLE',
  sessionCreateFailed: 'SESSION_CREATE_FAILED',
  sessionJoinFailed: 'SESSION_JOIN_FAILED',
  invalidRoomCode: 'INVALID_ROOM_CODE',
  unauthorized: 'UNAUTHORIZED',
  storyRequired: 'STORY_REQUIRED',
  roundNotActive: 'ROUND_NOT_ACTIVE',
  resultsNotRevealed: 'RESULTS_NOT_REVEALED',
  finalEstimateRequired: 'FINAL_ESTIMATE_REQUIRED',
  voteLocked: 'VOTE_LOCKED',
  storyLocked: 'STORY_LOCKED',
  notImplemented: 'NOT_IMPLEMENTED',
  clientBuildNotFound: 'CLIENT_BUILD_NOT_FOUND',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
