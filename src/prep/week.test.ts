import { describe, it, expect } from 'vitest'
import { addDays, weekStart, weekDays, weekLabel, dayLabel } from './week'

describe('weekStart', () => {
  it('Wednesday is the 28th → Sunday the 25th', () => {
    expect(weekStart('2026-10-28')).toBe('2026-10-25')
  })

  it('Sunday stays on itself', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-25')
  })

  it('Saturday wraps to the Sunday that week', () => {
    expect(weekStart('2026-10-31')).toBe('2026-10-25')
  })

  it('start of year crosses back to December', () => {
    expect(weekStart('2027-01-01')).toBe('2026-12-27')
  })
})

describe('addDays', () => {
  it('crosses month boundary (end of October)', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  })

  it('subtracts 7 days from Sunday the 25th', () => {
    expect(addDays('2026-10-25', -7)).toBe('2026-10-18')
  })
})

describe('weekDays', () => {
  it('produces 7 entries from the start date', () => {
    const days = weekDays('2026-10-25')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-10-25')
    expect(days[6]).toBe('2026-10-31')
  })
})

describe('weekLabel', () => {
  it('Oct 25 – Oct 31', () => {
    const result = weekLabel('2026-10-25')
    expect(result).toBe('Oct 25' + String.fromCharCode(8211) + 'Oct 31')
  })

  it('Dec 27 – Jan 2 (cross-month)', () => {
    const result = weekLabel('2026-12-27')
    expect(result).toBe('Dec 27' + String.fromCharCode(8211) + 'Jan 2')
  })
})

describe('dayLabel', () => {
  it('Sunday Oct 25', () => {
    expect(dayLabel('2026-10-25')).toBe('Sun Oct 25')
  })
})
