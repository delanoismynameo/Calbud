import { describe, it, expect } from 'vitest'
import { stripDays } from './dayStrip'

describe('stripDays', () => {
  it('returns 5 entries in order with the middle selected', () => {
    const result = stripDays('2026-11-01', '2026-11-05')
    expect(result).toHaveLength(5)
    expect(result.map(d => d.date)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03'])
    expect(result[2].isSelected).toBe(true)
  })

  it('selected = today: last two are future, first three are not', () => {
    const result = stripDays('2026-10-28', '2026-10-28')
    expect(result.map(d => d.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'])
    expect(result[2].isSelected).toBe(true)
    expect([false, false, false, true, true]).toEqual(result.map(d => d.isFuture))
  })

  it('selected two days before today: none are future', () => {
    const result = stripDays('2026-10-28', '2026-10-30')
    expect(result.every(d => !d.isFuture)).toBe(true)
  })

  it('handles month boundary (selected 2026-10-31)', () => {
    const result = stripDays('2026-10-31', '2026-11-05')
    expect(result.map(d => d.date)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
    expect(result.map(d => d.dom)).toEqual([29, 30, 31, 1, 2])
  })

  it('handles year boundary (selected 2026-01-01)', () => {
    const result = stripDays('2026-01-01', '2026-01-10')
    expect(result.map(d => d.date)).toEqual(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03'])
  })

  it('returns correct dow for a known date (2026-10-29 is Thursday)', () => {
    const result = stripDays('2026-10-29', '2026-11-05')
    const entry = result.find(d => d.date === '2026-10-29')!
    expect(entry.dow).toBe('Thu')
  })
})
