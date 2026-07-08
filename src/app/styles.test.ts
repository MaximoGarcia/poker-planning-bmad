import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('app styles', () => {
  it('allows maximum length room codes to wrap inside narrow containers', () => {
    const styles = readFileSync('src/app/styles.css', 'utf8')
    const roomCodeRule = styles.match(/\.room-code\s*\{[^}]+\}/)?.[0] ?? ''

    expect(roomCodeRule).toContain('overflow-wrap: anywhere')
  })

  it('allows grouped result values and voter names to wrap inside narrow containers', () => {
    const styles = readFileSync('src/app/styles.css', 'utf8')
    const valueRule = styles.match(/\.vote-group-value\s*\{[^}]+\}/)?.[0] ?? ''
    const voterRule =
      styles.match(/\.vote-group-voters li,\r?\n\.vote-group-non-voters li\s*\{[^}]+\}/)?.[0] ??
      ''

    expect(valueRule).toContain('overflow-wrap: anywhere')
    expect(voterRule).toContain('overflow-wrap: anywhere')
  })

  it('allows estimated story identifiers and descriptions to wrap inside narrow containers', () => {
    const styles = readFileSync('src/app/styles.css', 'utf8')
    const estimatedFieldRule = styles.match(/\.estimated-story-field dd\s*\{[^}]+\}/)?.[0] ?? ''

    expect(estimatedFieldRule).toContain('overflow-wrap: anywhere')
  })
})
