import { describe, it, expect } from 'vitest'
import { streakText } from './streakText'

describe('streakText', () => {
  it('n=0 together=true', () => {
    expect(streakText(0, true)).toBe('No streak yet. Both log some food on the same day to start one.')
  })

  it('n=0 together=false', () => {
    expect(streakText(0, false)).toBe('No streak yet. Log some food today to start one.')
  })

  it('n=1 together=true', () => {
    expect(streakText(1, true)).toBe('1 day in a row, both of you logged food.')
  })

  it('n=3 together=true', () => {
    expect(streakText(3, true)).toBe('3 days in a row, both of you logged food.')
  })

  it('n=1 together=false', () => {
    expect(streakText(1, false)).toBe('1 day in a row with food logged.')
  })

  it('n=2 together=false', () => {
    expect(streakText(2, false)).toBe('2 days in a row with food logged.')
  })

  it('n=60 together=true', () => {
    expect(streakText(60, true)).toBe('60+ days in a row, both of you logged food.')
  })

  it('n=75 together=false', () => {
    expect(streakText(75, false)).toBe('60+ days in a row with food logged.')
  })
})
