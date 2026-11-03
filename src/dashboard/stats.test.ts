import { describe, it, expect } from 'vitest'
import { kcalByUserDay, lastWeek, averageKcal, onTarget, streak } from './stats'
import type { ByDay } from './stats'
import { addDays } from '../prep/week'

describe('kcalByUserDay', () => {
  it('groups rows by user and day, summing kcal', () => {
    expect(
      kcalByUserDay([
        { user_id: 'a', logged_on: '2026-10-29', kcal: 100 },
        { user_id: 'a', logged_on: '2026-10-29', kcal: 50.4 },
        { user_id: 'b', logged_on: '2026-10-28', kcal: 300 },
      ]),
    ).toEqual({ a: { '2026-10-29': 150 }, b: { '2026-10-28': 300 } })
  })

  it('returns empty object for no rows', () => {
    expect(kcalByUserDay([])).toEqual({})
  })
})

describe('lastWeek', () => {
  it('returns 7 dates ending at today, oldest first', () => {
    expect(lastWeek('2026-10-29')).toEqual([
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
    ])
  })

  it('respects different input dates', () => {
    expect(lastWeek('2026-11-02')[0]).toBe('2026-10-27')
  })
})

describe('averageKcal', () => {
  it('averages only the days in the range', () => {
    expect(
      averageKcal({ '2026-10-28': 2000, '2026-10-29': 1500, '2026-10-01': 9999 }, lastWeek('2026-10-29')),
    ).toBe(1750) // the October 1 entry is outside the week
  })

  it('returns null when byDay is undefined or empty', () => {
    expect(averageKcal(undefined, lastWeek('2026-10-29'))).toBeNull()
    expect(averageKcal({}, lastWeek('2026-10-29'))).toBeNull()
  })

  it('averages all days when they match the range', () => {
    expect(averageKcal({ '2026-10-28': 1001, '2026-10-29': 1000 }, lastWeek('2026-10-29'))).toBe(1001)
  })
})

describe('onTarget', () => {
  it('checks if kcal is within tolerance of goal', () => {
    expect(onTarget(2100, 2000)).toBe(true)
    expect(onTarget(2200, 2000)).toBe(true)
    expect(onTarget(2201, 2000)).toBe(false)
    expect(onTarget(1800, 2000)).toBe(true)
    expect(onTarget(1799, 2000)).toBe(false)
    expect(onTarget(undefined, 2000)).toBe(false)
    expect(onTarget(2300, 2000, 0.2)).toBe(true)
  })
})

describe('streak', () => {
  it('counts days both logged, whatever the calories', () => {
    const people: { byDay: ByDay }[] = [
      { byDay: { '2026-10-27': 900, '2026-10-28': 4100, '2026-10-29': 2000 } },
      { byDay: { '2026-10-27': 2500, '2026-10-28': 300, '2026-10-29': 1000 } },
    ]
    expect(streak(people, '2026-10-29', 60)).toBe(3)
  })

  it('partner has not logged today: counts back from yesterday', () => {
    const people: { byDay: ByDay }[] = [
      { byDay: { '2026-10-27': 2000, '2026-10-28': 2100, '2026-10-29': 2000 } },
      { byDay: { '2026-10-27': 2500, '2026-10-28': 2400 } },
    ]
    expect(streak(people, '2026-10-29', 60)).toBe(2)
  })

  it('stops at a day one person skipped', () => {
    const people: { byDay: ByDay }[] = [
      { byDay: { '2026-10-26': 2000, '2026-10-27': 2000, '2026-10-28': 2000 } },
      { byDay: { '2026-10-26': 2000, '2026-10-28': 2000 } },
    ]
    expect(streak(people, '2026-10-29', 60)).toBe(1)
  })

  it('a day logged with 0 cal still counts', () => {
    const people = [{ byDay: { '2026-10-28': 0, '2026-10-29': 0 } }]
    expect(streak(people, '2026-10-29', 60)).toBe(2)
  })

  it('one person only: has nothing today yet', () => {
    const people = [{ byDay: { '2026-10-28': 2000 } }]
    expect(streak(people, '2026-10-29', 60)).toBe(1)
  })

  it('one person only: has nothing at all', () => {
    expect(streak([{ byDay: {} }], '2026-10-29', 60)).toBe(0)
  })

  it('one person only: undefined byDay', () => {
    expect(streak([{ byDay: undefined }], '2026-10-29', 60)).toBe(0)
  })

  it('respects maxDays cap', () => {
    const byDay: ByDay = {}
    for (let i = 0; i < 10; i++) byDay[addDays('2026-10-29', -i)] = 2000
    expect(streak([{ byDay }], '2026-10-29', 5)).toBe(5)
  })

  it('empty people list gives 0', () => {
    expect(streak([], '2026-10-29', 60)).toBe(0)
  })
})
