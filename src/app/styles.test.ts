import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('app styles', () => {
  it('allows maximum length room codes to wrap inside narrow containers', () => {
    const styles = readFileSync('src/app/styles.css', 'utf8')
    const roomCodeRule = styles.match(/\.room-code\s*\{[^}]+\}/)?.[0] ?? ''

    expect(roomCodeRule).toContain('overflow-wrap: anywhere')
  })
})
