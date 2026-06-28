import { describe, expect, it } from 'vitest'
import { generateModeratorToken } from './capability-tokens.js'

describe('capability tokens', () => {
  it('generates opaque unguessable moderator tokens', () => {
    const firstToken = generateModeratorToken()
    const secondToken = generateModeratorToken()

    expect(firstToken).toMatch(/^[A-Za-z0-9_-]{32,}$/)
    expect(secondToken).toMatch(/^[A-Za-z0-9_-]{32,}$/)
    expect(firstToken).not.toBe(secondToken)
  })
})
