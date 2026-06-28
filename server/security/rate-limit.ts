const DEFAULT_CREATE_SESSION_MAX_EVENTS = 3
const DEFAULT_CREATE_SESSION_WINDOW_MS = 10_000

export type RateLimitResult =
  | {
      allowed: true
    }
  | {
      allowed: false
      retryAfterMs: number
    }

export interface SocketRateLimiterOptions {
  maxEvents?: number
  windowMs?: number
  now?: () => number
}

export interface SocketRateLimiter {
  consume(socketId: string): RateLimitResult
  reset(socketId: string): void
  size(): number
}

export function createSocketRateLimiter({
  maxEvents = DEFAULT_CREATE_SESSION_MAX_EVENTS,
  windowMs = DEFAULT_CREATE_SESSION_WINDOW_MS,
  now = Date.now,
}: SocketRateLimiterOptions = {}): SocketRateLimiter {
  const attempts = new Map<string, { count: number; windowStartedAt: number }>()

  return {
    consume(socketId) {
      const currentTime = now()
      pruneExpiredAttempts(attempts, currentTime, windowMs)

      const socketAttempts = attempts.get(socketId)

      if (!socketAttempts || currentTime - socketAttempts.windowStartedAt >= windowMs) {
        attempts.set(socketId, { count: 1, windowStartedAt: currentTime })
        return { allowed: true }
      }

      if (socketAttempts.count < maxEvents) {
        socketAttempts.count += 1
        return { allowed: true }
      }

      return {
        allowed: false,
        retryAfterMs: Math.max(windowMs - (currentTime - socketAttempts.windowStartedAt), 0),
      }
    },
    reset(socketId) {
      attempts.delete(socketId)
    },
    size() {
      return attempts.size
    },
  }
}

function pruneExpiredAttempts(
  attempts: Map<string, { count: number; windowStartedAt: number }>,
  currentTime: number,
  windowMs: number,
) {
  for (const [socketId, socketAttempts] of attempts) {
    if (currentTime - socketAttempts.windowStartedAt >= windowMs) {
      attempts.delete(socketId)
    }
  }
}
