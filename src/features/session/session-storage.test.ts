import { describe, expect, it, vi } from 'vitest'
import {
  participantTokenStorageKey,
  readModeratorToken,
  saveModeratorToken,
  saveParticipantToken,
} from './session-storage'

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

  it('stores participant tokens under a room-and-participant scoped sessionStorage key', () => {
    expect(saveParticipantToken('ABCD12', 'participant-1', 'participant-token')).toBe(true)
    expect(window.sessionStorage.getItem(participantTokenStorageKey('ABCD12', 'participant-1'))).toBe(
      'participant-token',
    )
  })
})
