import { describe, it, expect } from 'vitest'
import type { FoodResult, Ingredient } from './types'
import { recipeFood } from './recipe'
import { builtLabel } from './builtLabel'

function food(overrides: Partial<FoodResult>): FoodResult {
  return {
    source: 'usda',
    sourceId: 'x',
    name: 'Food',
    brand: null,
    servingG: null,
    servingLabel: null,
    kcal100g: 0,
    protein100g: 0,
    carbs100g: 0,
    fat100g: 0,
    fiber100g: null,
    sugar100g: null,
    sodiumMg100g: null,
    barcode: null,
    ...overrides,
  }
}

const yogurt = food({ name: 'Yogurt', kcal100g: 59, protein100g: 10.2, carbs100g: 3.6, fat100g: 0.4, servingG: 150, extras100g: { sodium_mg: 36 } })
const mandarin = food({ name: 'Mandarin', kcal100g: 53, protein100g: 0.8, carbs100g: 13.3, fat100g: 0.3, servingG: 196, extras100g: { sodium_mg: 2, fiber_g: 1.8 } })
const granola = food({ name: 'Granola', kcal100g: 471, protein100g: 10, carbs100g: 64, fat100g: 20, extras100g: {} })

const bowl: Ingredient[] = [
  { food: yogurt, amount: 1, unit: 'serving' },
  { food: mandarin, amount: 1 / 2, unit: 'serving' },
  { food: granola, amount: 30, unit: 'g' },
]

describe('builtLabel servings', () => {
  it('bowl with servings:1 has correct label data', () => {
    const built = recipeFood({ ingredients: bowl, yield: { kind: 'servings', servings: 1 } }, 'Bowl', 'b')
    const label = builtLabel(built)
    expect(label.servingText).toBe('1 serving (278 g)')
    expect(label.kcal).toBe(282)
    const fatRow = label.rows.find(r => r.key === 'fat')!
    expect(fatRow?.amount).toBe('6.9 g')
    const sodiumRow = label.rows.find(r => r.key === 'sodium_mg')!
    expect(sodiumRow?.amount).toBe('56 mg')
  })
})

describe('builtLabel weight', () => {
  it('bowl with yield weight totalG=200 has correct label data', () => {
    const built = recipeFood({ ingredients: bowl, yield: { kind: 'weight', totalG: 200 } }, 'Bowl', 'b')
    const label = builtLabel(built)
    expect(label.servingText).toBe('100 g')
    expect(label.kcal).toBe(Math.round(282 / 200 * 100))
  })
})
