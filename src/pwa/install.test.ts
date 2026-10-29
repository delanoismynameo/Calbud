import { describe, it, expect } from 'vitest'
import { installHint, installText } from './install'

describe('installHint', () => {
  it("detects iPhone as 'ios'", () => {
    const result = installHint('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5, false)
    expect(result).toBe('ios')
  })

  it("detects iPad (Macintosh with touch points) as 'ios', but real Mac as 'other'", () => {
    const ipadAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    expect(installHint(ipadAgent, 5, false)).toBe('ios')
    expect(installHint(ipadAgent, 0, false)).toBe('other')
  })

  it("detects Android as 'other'", () => {
    const result = installHint('Mozilla/5.0 (Linux; Android 14)', 5, false)
    expect(result).toBe('other')
  })

  it('returns null when already installed (standalone)', () => {
    expect(installHint('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5, true)).toBe(null)
    expect(installHint('Mozilla/5.0 (Linux; Android 14)', 5, true)).toBe(null)
  })
})

describe('installText', () => {
  it("returns the iOS install text", () => {
    expect(installText('ios')).toBe(
      'To install Calbud: tap Share, then Add to Home Screen.',
    )
  })

  it("returns the other-platform install text", () => {
    expect(installText('other')).toBe(
      'To install Calbud: open the browser menu, then Install app or Add to Home screen.',
    )
  })
})
