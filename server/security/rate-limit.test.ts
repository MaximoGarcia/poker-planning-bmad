import { describe, expect, it } from 'vitest'
import { createSocketRateLimiter } from './rate-limit.js'

describe('createSocketRateLimiter', () => {
  it('limits bursts per socket id and resets after the window', () => {
    let currentTime = 1_000
    const limiter = createSocketRateLimiter({
      maxEvents: 2,
      windowMs: 1_000,
      now: () => currentTime,
    })

    expect(limiter.consume('socket-1')).toEqual({ allowed: true })
    expect(limiter.consume('socket-1')).toEqual({ allowed: true })
    expect(limiter.consume('socket-1')).toEqual({ allowed: false, retryAfterMs: 1_000 })
    expect(limiter.consume('socket-2')).toEqual({ allowed: true })

    currentTime = 2_001

    expect(limiter.consume('socket-1')).toEqual({ allowed: true })
  })

  it('can clear a disconnected socket id', () => {
    const limiter = createSocketRateLimiter({
      maxEvents: 1,
      windowMs: 1_000,
      now: () => 1_000,
    })

    expect(limiter.consume('socket-1')).toEqual({ allowed: true })
    expect(limiter.consume('socket-1')).toEqual({ allowed: false, retryAfterMs: 1_000 })

    limiter.reset('socket-1')

    expect(limiter.consume('socket-1')).toEqual({ allowed: true })
  })

  it('prunes expired socket ids during later consumes', () => {
    let currentTime = 1_000
    const limiter = createSocketRateLimiter({
      maxEvents: 1,
      windowMs: 1_000,
      now: () => currentTime,
    })

    expect(limiter.consume('socket-1')).toEqual({ allowed: true })

    currentTime = 2_001

    expect(limiter.consume('socket-2')).toEqual({ allowed: true })
    expect(limiter.size()).toBe(1)
  })
})
