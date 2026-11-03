import { describe, it, expect } from 'vitest'
import { logToVirtualFood, computeNutrition } from './EditMealLog'
import type { MealLog } from './types'

function mealLog(overrides: Partial<MealLog> = {}): MealLog {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: 'u1',
    logged_on: '2026-01-01',
    meal_type: 'lunch',
    food_id: 'f1',
    name: 'Test Food',
    quantity_g: 200,
    kcal: 500,
    protein_g: 20,
    carbs_g: 60,
    fat_g: 10,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('logToVirtualFood', () => {
  it('converts MealLog to virtual FoodResult with correct per-100g values', () => {
    const log = mealLog({
      quantity_g: 200,
      kcal: 500,
      protein_g: 20,
      carbs_g: 60,
      fat_g: 10,
    })
    const result = logToVirtualFood(log)

    expect(result.kcal100g).toBe(250) // 500 / 200 * 100

    expect(result.protein100g).toBe(10) // 20 / 200 * 100
    expect(result.carbs100g).toBe(30) // 60 / 200 * 100
    expect(result.fat100g).toBe(5) // 10 / 200 * 100

    expect(result.source).toBe('usda')
    expect(result.name).toBe('Test Food')
    expect(result.unit).toBe('g')
  })

  it('handles extras correctly', () => {
    const log = mealLog({
      quantity_g: 100,
      kcal: 300,
      protein_g: 10,
      carbs_g: 50,
      fat_g: 5,
      extra: { sodium_mg: 200, fiber_g: 5 },
    })
    const result = logToVirtualFood(log)

    expect(result.extras100g).toBeDefined()
    // Extras are per-log in MealLog, should be converted to per-100g
    // Since quantity_g = 100, extras should stay the same for per-100g
    expect(result.extras100g!.sodium_mg).toBe(200)
    expect(result.extras100g!.fiber_g).toBe(5)
  })

  it('handles different gram amounts', () => {
    const log = mealLog({
      quantity_g: 300,
      kcal: 600,
      protein_g: 30,
      carbs_g: 90,
      fat_g: 15,
    })
    const result = logToVirtualFood(log)

    expect(result.kcal100g).toBe(200) // 600 / 300 * 100
    expect(result.protein100g).toBe(10) // 30 / 300 * 100
    expect(result.carbs100g).toBe(30) // 90 / 300 * 100
    expect(result.fat100g).toBe(5) // 15 / 300 * 100
  })

  it('handles missing extra', () => {
    const log = mealLog({
      quantity_g: 200,
      kcal: 400,
      protein_g: 15,
      carbs_g: 45,
      fat_g: 8,
    })
    const result = logToVirtualFood(log)

    expect(result.extras100g).toBeUndefined()
  })
})

describe('computeNutrition', () => {
  // Helper to create a simple FoodResult
  function createFood(kcal100g: number, protein100g: number, carbs100g: number, fat100g: number): ReturnType<typeof logToVirtualFood> {
    return {
      source: 'usda',
      sourceId: 'test',
      name: 'Test',
      brand: null,
      servingG: null,
      servingLabel: null,
      unit: 'g',
      kcal100g,
      protein100g,
      carbs100g,
      fat100g,
      fiber100g: null,
      sugar100g: null,
      sodiumMg100g: null,
      barcode: null,
      extras100g: undefined,
    }
  }

  it('computes nutrition for a given gram amount', () => {
    const food = createFood(250, 10, 30, 5)
    const result = computeNutrition(food, 200)

    expect(result).not.toBeNull()
    expect(result!.kcal).toBe(500) // 250 * 200 / 100
    expect(result!.protein_g).toBe(20) // 10 * 200 / 100
    expect(result!.carbs_g).toBe(60) // 30 * 200 / 100
    expect(result!.fat_g).toBe(10) // 5 * 200 / 100
  })

  it('returns null for invalid grams', () => {
    const food = createFood(250, 10, 30, 5)

    expect(computeNutrition(food, 0)).toBeNull()
    expect(computeNutrition(food, -10)).toBeNull()
    expect(computeNutrition(food, NaN)).toBeNull()
    expect(computeNutrition(food, 5001)).toBeNull()
  })

  it('handles rounding correctly', () => {
    const food = createFood(143, 12.6, 25, 7)
    const result = computeNutrition(food, 33)

    expect(result).not.toBeNull()
    expect(result!.kcal).toBe(47) // 143 * 33 / 100 = 47.19 -> 47
    expect(result!.protein_g).toBe(4.2) // 12.6 * 33 / 100 = 4.158 -> 4.2
  })

  it('scales nutrition proportionally', () => {
    const food = createFood(100, 5, 20, 8)

    const result50 = computeNutrition(food, 50)
    expect(result50!.kcal).toBe(50)
    expect(result50!.protein_g).toBe(2.5)

    const result100 = computeNutrition(food, 100)
    expect(result100!.kcal).toBe(100)
    expect(result100!.protein_g).toBe(5)

    const result300 = computeNutrition(food, 300)
    expect(result300!.kcal).toBe(300)
    expect(result300!.protein_g).toBe(15)
  })

  it('scales extras proportionally', () => {
    const food = createFood(100, 10, 20, 5)
    food.extras100g = { fiber_g: 3, sodium_mg: 50 }
    const result = computeNutrition(food, 200)

    expect(result).not.toBeNull()
    expect(result!.extras).toBeDefined()
    expect(result!.extras!.fiber_g).toBe(6) // 3 * 200 / 100
    expect(result!.extras!.sodium_mg).toBe(100) // 50 * 200 / 100
  })

  it('handles missing extras', () => {
    const food = createFood(100, 5, 20, 8)
    const result = computeNutrition(food, 100)

    expect(result).not.toBeNull()
    expect(result!.extras).toBeUndefined()
  })
})

describe('logToVirtualFood and computeNutrition integration', () => {
  it('correctly converts and scales throughout the workflow', () => {
    // Simulate: log 200g with 500 kcal
    const log = mealLog({
      quantity_g: 200,
      kcal: 500,
      protein_g: 20,
      carbs_g: 60,
      fat_g: 10,
    })

    // Convert to virtual food (per-100g values)
    const virtualFood = logToVirtualFood(log)
    expect(virtualFood.kcal100g).toBe(250)

    // Display for 200g
    const nutrition200 = computeNutrition(virtualFood, 200)
    expect(nutrition200!.kcal).toBe(500)

    // Change to 300g and display
    const nutrition300 = computeNutrition(virtualFood, 300)
    expect(nutrition300!.kcal).toBe(750)

    // User edits calories to 800
    // This would call applyLabelEdit(virtualFood, 'kcal', 800, 300)
    // which would give kcal100g = 800 / 300 * 100 = 266.67

    // Now display for 400g
    const editedFood = { ...virtualFood, kcal100g: 800 / 300 * 100 }
    const nutrition400 = computeNutrition(editedFood, 400)
    expect(nutrition400!.kcal).toBe(Math.round(800 / 300 * 100 * 400 / 100))

    // This equals 800 * 400 / 300 = 1066.67, but we need to round
    // Actually: 800/300*100 = 266.67 per-100g
    // 266.67 * 400 / 100 = 1066.67 -> 1067 kcal
    expect(nutrition400!.kcal).toBe(1067)
  })

  it('handles extras conversion correctly', () => {
    // Test with extra values
    const log = mealLog({
      quantity_g: 200,
      kcal: 400,
      protein_g: 20,
      carbs_g: 30,
      fat_g: 10,
      extra: { sodium_mg: 200 },
    })

    const virtualFood = logToVirtualFood(log)
    expect(virtualFood.extras100g!.sodium_mg).toBe(100) // 200 / 200 * 100
  })
})