import { describe, it, expect } from 'vitest'
import type { FoodResult } from './types'
import { foodRow, mealLogRow } from './rows'

const FOOD: FoodResult = {
  source: 'off',
  sourceId: 'test-food-123',
  name: 'Test Food',
  brand: null,
  servingG: null,
  servingLabel: null,
  kcal100g: 143,
  protein100g: 12.6,
  carbs100g: 25.0,
  fat100g: 7.0,
  fiber100g: null,
  sugar100g: null,
  sodiumMg100g: null,
  barcode: null,
}

const FOOD_WITH_BRAND: FoodResult = { ...FOOD, brand: 'Test Brand' }

const ALL_KEYS = [
  'household_id', 'source', 'source_id', 'name', 'brand',
  'serving_g', 'serving_label',
  'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g',
  'fiber_100g', 'sugar_100g', 'sodium_mg_100g', 'extra_100g',
]

describe('foodRow', () => {
  it('has exactly the 15 column keys', () => {
    const row = foodRow(FOOD, 'hh-1')
    const keys = Object.keys(row) as (keyof typeof row)[]
    expect(keys).toEqual(ALL_KEYS)
  })

  it('maps values correctly', () => {
    const row = foodRow(FOOD, 'hh-42')
    expect(row.household_id).toBe('hh-42')
    expect(row.source).toBe('off')
    expect(row.source_id).toBe('test-food-123')
    expect(row.name).toBe('Test Food')
    expect(row.brand).toBeNull()
    expect(row.serving_g).toBeNull()
    expect(row.kcal_100g).toBe(143)
    expect(row.protein_100g).toBe(12.6)
  })
})

describe('mealLogRow', () => {
  it('for 150 g of 143/12.6 food gives kcal: 215 and protein_g: 18.9', () => {
    const row = mealLogRow({
      food: FOOD,
      foodId: 'food-uuid',
      grams: 150,
      mealType: 'breakfast',
      loggedOn: '2026-01-01',
      userId: 'user-1',
    })
    expect(row.kcal).toBe(215)
    expect(row.protein_g).toBe(18.9)
  })

  it('name has brand only when there is one', () => {
    const withoutBrand = mealLogRow({ food: FOOD, foodId: 'x', grams: 100, mealType: 'lunch', loggedOn: '2026-01-01', userId: 'u' })
    expect(withoutBrand.name).toBe('Test Food')

    const withBrand = mealLogRow({ food: FOOD_WITH_BRAND, foodId: 'x', grams: 100, mealType: 'lunch', loggedOn: '2026-01-01', userId: 'u' })
    expect(withBrand.name).toBe('Test Food (Test Brand)')
  })

  it('maps all fields correctly', () => {
    const row = mealLogRow({
      food: FOOD,
      foodId: 'food-uuid',
      grams: 100,
      mealType: 'dinner',
      loggedOn: '2026-12-31',
      userId: 'user-42',
    })
    expect(row.user_id).toBe('user-42')
    expect(row.logged_on).toBe('2026-12-31')
    expect(row.meal_type).toBe('dinner')
    expect(row.food_id).toBe('food-uuid')
    expect(row.quantity_g).toBe(100)
    expect(row.kcal).toBe(143)
  })

  it('carries extra scaled to grams', () => {
    const row = mealLogRow({
      food: { ...FOOD, extras100g: { sodium_mg: 49 } },
      foodId: 'x',
      grams: 240,
      mealType: 'lunch',
      loggedOn: '2026-01-01',
      userId: 'u',
    })
    expect(row.extra).toEqual({ sodium_mg: 117.6 })
  })
})
