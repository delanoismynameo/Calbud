import { describe, it, expect } from 'vitest'
import { sumLogs, groupByMeal, rescaleLog, progress } from './totals'
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

describe('sumLogs', () => {
  it('adds two logs', () => {
    const result = sumLogs([
      log({ kcal: 215, protein_g: 18.9, quantity_g: 100 }),
      log({ kcal: 105, protein_g: 1.3, fat_g: 1.3, quantity_g: 100 }),
    ])
    expect(result.kcal).toBe(320)
    expect(result.protein_g).toBe(20.2)
  })

  it('returns zeros for empty list', () => {
    const result = sumLogs([])
    expect(result).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  })

  it('rounds floating point to avoid JS artefacts', () => {
    const result = sumLogs([log({ fat_g: 0.1 }), log({ fat_g: 0.2 })])
    expect(result.fat_g).toBe(0.3)
  })
})

describe('groupByMeal', () => {
  it('returns all four meals in MEALS order with only lunch non-empty', () => {
    const groups = groupByMeal([log({ meal_type: 'lunch' })])
    expect(groups.map(g => g.meal)).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
    expect(groups[0].logs).toHaveLength(0)
    expect(groups[1].logs).toHaveLength(1)
    expect(groups[2].logs).toHaveLength(0)
    expect(groups[3].logs).toHaveLength(0)
  })
})

describe('rescaleLog', () => {
  it('scales proportionally', () => {
    const base = log({ quantity_g: 150, kcal: 215, protein_g: 18.9 })
    const result = rescaleLog(base, 300)
    expect(result.kcal).toBe(430)
    expect(result.protein_g).toBe(37.8)
  })

  it('throws for non-positive grams', () => {
    const base = log()
    expect(() => rescaleLog(base, 0)).toThrow(RangeError)
  })

  it('throws for NaN grams', () => {
    const base = log()
    expect(() => rescaleLog(base, NaN)).toThrow(RangeError)
  })
})

describe('progress', () => {
  it('returns percentage of goal', () => {
    expect(progress(50, 200)).toBe(25)
  })

  it('caps at 100 when over goal', () => {
    expect(progress(300, 200)).toBe(100)
  })

  it('returns 0 when goal is zero', () => {
    expect(progress(10, 0)).toBe(0)
  })
})
