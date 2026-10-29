import { describe, it, expect } from 'vitest'
import { dayTitle, validDayParam, copyRows } from './day'
import type { MealLog } from './types'

function log(overrides: Partial<MealLog> = {}): MealLog {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: 'u1',
    logged_on: '2026-01-01',
    meal_type: 'lunch',
    food_id: null,
    name: 'food',
    quantity_g: 200,
    kcal: 500,
    protein_g: 20,
    carbs_g: 60,
    fat_g: 10,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('dayTitle', () => {
  it("returns 'Today' when date equals today", () => {
    expect(dayTitle('2026-10-28', '2026-10-28')).toBe('Today')
  })

  it("returns 'Yesterday' when date is one day before today", () => {
    expect(dayTitle('2026-10-27', '2026-10-28')).toBe('Yesterday')
  })

  it("returns dayLabel for dates not today or yesterday", () => {
    expect(dayTitle('2026-10-26', '2026-10-28')).toBe('Mon Oct 26')
  })

  it("returns 'Yesterday' even when from a different today's perspective", () => {
    expect(dayTitle('2026-10-31', '2026-11-01')).toBe('Yesterday')
  })
})

describe('validDayParam', () => {
  it("returns param when valid with today '2026-10-28'", () => {
    expect(validDayParam('2026-10-26', '2026-10-28')).toBe('2026-10-26')
    expect(validDayParam('2026-10-28', '2026-10-28')).toBe('2026-10-28')
  })

  it('returns null for invalid params', () => {
    const today = '2026-10-28'
    expect(validDayParam(null, today)).toBeNull()
    expect(validDayParam('2026-10-29', today)).toBeNull()
    expect(validDayParam('abc', today)).toBeNull()
    expect(validDayParam('2026-02-30', today)).toBeNull()
    expect(validDayParam('2026-1-5', today)).toBeNull()
  })
})

describe('copyRows', () => {
  it('copies two logs with the correct fields and logged_on', () => {
    const result = copyRows(
      [log({ id: 'a', meal_type: 'breakfast', name: 'Oats', food_id: 'f1' }), log({ id: 'b' })],
      '2026-10-28',
    )
    expect(result).toEqual([
      { user_id: 'u1', logged_on: '2026-10-28', meal_type: 'breakfast', food_id: 'f1', name: 'Oats', quantity_g: 200, kcal: 500, protein_g: 20, carbs_g: 60, fat_g: 10 },
      { user_id: 'u1', logged_on: '2026-10-28', meal_type: 'lunch', food_id: null, name: 'food', quantity_g: 200, kcal: 500, protein_g: 20, carbs_g: 60, fat_g: 10 },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(copyRows([], '2026-10-28')).toEqual([])
  })

  it('copies extra when present', () => {
    const result = copyRows([log({ extra: { sodium_mg: 5 } })], '2026-10-28')
    expect(result[0].extra).toEqual({ sodium_mg: 5 })
  })
})
