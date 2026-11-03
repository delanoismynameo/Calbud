import { describe, it, expect } from 'vitest'
import { waterProgress, lastAdd } from './water'
import type { WaterLog } from './waterTypes'

const log = (amount_oz: number, created_at: string, id = created_at): WaterLog =>
  ({ id, user_id: 'u', logged_on: '2026-11-03', amount_oz, created_at })

describe('waterProgress', () => {
  it('adds up the day and fills toward the goal', () => {
    expect(waterProgress([log(8, 'a'), log(24, 'b')], 64)).toEqual({ total: 32, percent: 50, reached: false })
  })
  it('caps the bar at 100 and keeps counting past the goal', () => {
    expect(waterProgress([log(48, 'a'), log(24, 'b')], 64)).toEqual({ total: 72, percent: 100, reached: true })
  })
  it('nothing logged, or no goal', () => {
    expect(waterProgress([], 64)).toEqual({ total: 0, percent: 0, reached: false })
    expect(waterProgress([log(8, 'a')], 0)).toEqual({ total: 8, percent: 0, reached: false })
  })
  it('counts amounts that arrive as text', () => {
    expect(waterProgress([{ ...log(0, 'a'), amount_oz: '16' as unknown as number }], 64).total).toBe(16)
  })
})

describe('lastAdd', () => {
  it('is the newest add of the day, whatever the order', () => {
    expect(lastAdd([log(8, '2026-11-03T09:00:00Z'), log(24, '2026-11-03T15:00:00Z'), log(16, '2026-11-03T12:00:00Z')])?.amount_oz).toBe(24)
  })
  it('is null with nothing logged', () => {
    expect(lastAdd([])).toBeNull()
  })
})
