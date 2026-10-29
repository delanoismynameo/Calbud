import { describe, it, expect } from 'vitest'
import { streakText } from './streakText'

describe('streakText', () => {
  it('n=0 together=true', () => {
    expect(streakText(0, true)).toBe('No streak yet. Both finish a day within 10% of your goals to start one.')
  })

  it('n=0 together=false', () => {
    expect(streakText(0, false)).toBe('No streak yet. Finish a day within 10% of your goal to start one.')
  })

  it('n=1 together=true', () => {
    expect(streakText(1, true)).toBe('1 day in a row, both within 10% of your goals.')
  })

  it('n=3 together=true', () => {
    expect(streakText(3, true)).toBe('3 days in a row, both within 10% of your goals.')
  })

  it('n=1 together=false', () => {
    expect(streakText(1, false)).toBe('1 day in a row within 10% of your goal.')
  })

  it('n=2 together=false', () => {
    expect(streakText(2, false)).toBe('2 days in a row within 10% of your goal.')
  })

  it('n=60 together=true', () => {
    expect(streakText(60, true)).toBe('60+ days in a row, both within 10% of your goals.')
  })

  it('n=75 together=false', () => {
    expect(streakText(75, false)).toBe('60+ days in a row within 10% of your goal.')
  })
})
