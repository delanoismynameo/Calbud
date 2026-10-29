import { describe, it, expect } from 'vitest'
import type { MealLog } from './types'
import { dayNutrition, foodCount } from './dayNutrition'

// Helper: create a base MealLog with overrides applied.
function log(overrides?: Partial<MealLog>): MealLog {
  return {
    id: 'l1',
    user_id: 'me',
    logged_on: '2026-10-29',
    meal_type: 'lunch',
    food_id: null,
    name: 'Rice',
    quantity_g: 100,
    kcal: 130,
    protein_g: 2.7,
    carbs_g: 28,
    fat_g: 0.3,
    created_at: '',
    ...(overrides as object),
  }
}

describe('dayNutrition', () => {
  it('two logs with extras: correct totals and per-row amounts', () => {
    const r = dayNutrition([
      log({ extra: { sodium_mg: 100, fiber_g: 1 } }),
      log({ id: 'l2', kcal: 70, fat_g: 5, extra: { sodium_mg: 360 } }),
    ])
    expect(r.kcal).toBe(200)
    const totalFat = r.rows.find(row => row.key === 'fat')!
    expect(totalFat.amount).toBe('5.3 g')
    const sodium = r.rows.find(row => row.key === 'sodium_mg')!
    expect(sodium.amount).toBe('460 mg')
    expect(sodium.dv).toBe(20)
    expect((sodium as any).missing).toBe(undefined)
  })

  it('fiber row has missing count when only one log contributed', () => {
    const r = dayNutrition([
      log({ extra: { sodium_mg: 100, fiber_g: 1 } }),
      log({ id: 'l2', kcal: 70, fat_g: 5, extra: { sodium_mg: 360 } }),
    ])
    const fiber = r.rows.find(row => row.key === 'fiber_g')!
    expect(fiber.amount).toBe('1 g')
    expect((fiber as any).missing).toBe(1)
  })

  it('Cholesterol row when no log has that key: null amount, no missing field', () => {
    const r = dayNutrition([
      log({ extra: { sodium_mg: 100 } }),
    ])
    expect(r.kcal).toBe(130)
    const cholesterol = r.rows.find(row => row.key === 'cholesterol_mg')!
    expect(cholesterol.amount).toBe(null)
    expect((cholesterol as any).missing).toBe(undefined)
  })

  it('one log with no extra at all: every extra row is null, Protein present', () => {
    const r = dayNutrition([log()])
    expect(r.kcal).toBe(130)
    const protein = r.rows.find(row => row.key === 'protein')!
    expect(protein.amount).toBe('2.7 g')
    for (const key of ['sat_fat_g', 'trans_fat_g', 'cholesterol_mg', 'sodium_mg', 'fiber_g', 'sugar_g',
      'added_sugar_g', 'vit_d_mcg', 'calcium_mg', 'iron_mg', 'potassium_mg'] as const) {
      const row = r.rows.find(row => row.key === key)!
      expect(row.amount).toBe(null)
      expect((row as any).missing).toBe(undefined)
    }
  })

  it('no logs: kcal 0, Total Fat 0 g, extras null', () => {
    const r = dayNutrition([])
    expect(r.kcal).toBe(0)
    const totalFat = r.rows.find(row => row.key === 'fat')!
    expect(totalFat.amount).toBe('0 g')
    for (const key of ['sat_fat_g', 'sodium_mg', 'fiber_g'] as const) {
      const row = r.rows.find(row => row.key === key)!
      expect(row.amount).toBe(null)
      expect((row as any).missing).toBe(undefined)
    }
  })

  it('foodCount: singular and plural forms', () => {
    expect(foodCount(1)).toBe('1 food')
    expect(foodCount(3)).toBe('3 foods')
  })
})
