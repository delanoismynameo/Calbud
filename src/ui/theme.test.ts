import { describe, it, expect } from 'vitest'
import { parseTheme, resolveTheme } from './theme'

describe('parseTheme', () => {
  it('returns dark for "dark"', () => {
    expect(parseTheme('dark')).toBe('dark')
  })

  it('returns light for "light"', () => {
    expect(parseTheme('light')).toBe('light')
  })

  it('returns system for "system"', () => {
    expect(parseTheme('system')).toBe('system')
  })

  it('returns system for invalid string "x"', () => {
    expect(parseTheme('x')).toBe('system')
  })

  it('returns system for empty string', () => {
    expect(parseTheme('')).toBe('system')
  })

  it('returns system for null', () => {
    expect(parseTheme(null)).toBe('system')
  })

  it('returns system for undefined', () => {
    expect(parseTheme(undefined)).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('pref -> dark with systemDark true', () => {
    expect(resolveTheme('system', true)).toBe('dark')
  })

  it('pref -> light with systemDark false', () => {
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('light always returns light regardless of systemDark (true)', () => {
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('light always returns light regardless of systemDark (false)', () => {
    expect(resolveTheme('light', false)).toBe('light')
  })

  it('dark always returns dark regardless of systemDark (true)', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
  })

  it('dark always returns dark regardless of systemDark (false)', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
