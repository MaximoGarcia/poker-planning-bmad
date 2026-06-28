import { describe, expect, it, vi } from 'vitest'
import { readModeratorToken, saveModeratorToken } from './session-storage'

describe('session-storage helpers', () => {
  it('does not throw when sessionStorage write access is unavailable', () => {
    const setItem = vi.spyOn(window.sessionStorage.__proto__, 'setItem')
    setItem.mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(() => saveModeratorToken('ABCD12', 'moderator-token')).not.toThrow()

    setItem.mockRestore()
  })

  it('returns null when sessionStorage read access is unavailable', () => {
    const getItem = vi.spyOn(window.sessionStorage.__proto__, 'getItem')
    getItem.mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(readModeratorToken('ABCD12')).toBeNull()

    getItem.mockRestore()
  })
})
