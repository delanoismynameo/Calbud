import { describe, it, expect } from 'vitest'
import type { FoodResult, Ingredient, Recipe } from './types'
import { ingredientGrams, recipeTotals, recipeError, recipeFood, cleanRecipe, RecipeTotals } from './recipe'

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
const chicken = food({ name: 'Chicken', kcal100g: 177, protein100g: 24, carbs100g: 0, fat100g: 8, extras100g: { sodium_mg: 95 } })
const packet = food({ name: 'Sauce packet', kcal100g: 300, protein100g: 5, carbs100g: 60, fat100g: 5, servingG: 35, extras100g: { sodium_mg: 4000 } })

const bowl: Ingredient[] = [
  { food: yogurt, amount: 1, unit: 'serving' },
  { food: mandarin, amount: 1 / 2, unit: 'serving' },
  { food: granola, amount: 30, unit: 'g' },
]

const batch: Ingredient[] = [
  { food: chicken, amount: 900, unit: 'g' },
  { food: packet, amount: 1, unit: 'serving' },
]

describe('ingredientGrams', () => {
  it('yogurt 1 serving → 150', () => {
    expect(ingredientGrams({ food: yogurt, amount: 1, unit: 'serving' })).toBe(150)
  })

  it('mandarin 0.5 serving → 98', () => {
    expect(ingredientGrams({ food: mandarin, amount: 0.5, unit: 'serving' })).toBe(98)
  })

  it('granola 30 g → 30', () => {
    expect(ingredientGrams({ food: granola, amount: 30, unit: 'g' })).toBe(30)
  })

  it("granola 2 'serving' (no servingG) → 2", () => {
    expect(ingredientGrams({ food: { ...granola, servingG: null } as any, amount: 2, unit: 'serving' })).toBe(2)
  })
})

describe('recipeTotals bowl', () => {
  it('grams=278 kcal=282 protein_g=19.1 carbs_g=37.6 fat_g=6.9', () => {
    const r = recipeTotals(bowl)
    expect(r.grams).toBe(278)
    expect(r.kcal).toBe(282)
    expect(r.protein_g).toBe(19.1)
    expect(r.carbs_g).toBe(37.6)
    expect(r.fat_g).toBe(6.9)
  })

  it('extras={sodium_mg:56, fiber_g:1.8} missing={sodium_mg:1, fiber_g:2}', () => {
    const r = recipeTotals(bowl)
    expect(r.extras.sodium_mg).toBe(56)
    expect(r.extras.fiber_g).toBe(1.8)
    expect(r.missing.sodium_mg).toBe(1)
    expect(r.missing.fiber_g).toBe(2)
  })
})

describe('recipeTotals batch', () => {
  it('grams=935 kcal=1698 protein_g=217.8 carbs_g=21 fat_g=73.8 extras={sodium_mg:2255} missing={}', () => {
    const r = recipeTotals(batch)
    expect(r.grams).toBe(935)
    expect(r.kcal).toBe(1698)
    expect(r.protein_g).toBe(217.8)
    expect(r.carbs_g).toBe(21)
    expect(r.fat_g).toBe(73.8)
    expect(r.extras.sodium_mg).toBe(2255)
    expect(r.missing).toEqual({})
  })
})

describe('recipeTotals([])', () => {
  it('grams=0 kcal=0 protein_g=0 carbs_g=0 fat_g=0 extras={} missing={}', () => {
    const r = recipeTotals([])
    expect(r.grams).toBe(0)
    expect(r.kcal).toBe(0)
    expect(r.protein_g).toBe(0)
    expect(r.carbs_g).toBe(0)
    expect(r.fat_g).toBe(0)
    expect(r.extras).toEqual({})
    expect(r.missing).toEqual({})
  })
})

describe('recipeError', () => {
  it('empty ingredients → Add at least one ingredient.', () => {
    expect(recipeError({ ingredients: [], yield: { kind: 'servings' as const, servings: 1 } })).toBe('Add at least one ingredient.')
  })

  it('servings:0 → Servings must be a whole number from 1 to 100.', () => {
    expect(recipeError({ ingredients: bowl, yield: { kind: 'servings' as const, servings: 0 } })).toBe('Servings must be a whole number from 1 to 100.')
  })

  it('servings:2.5 → Servings must be a whole number from 1 to 100.', () => {
    expect(recipeError({ ingredients: bowl, yield: { kind: 'servings' as const, servings: 2.5 } })).toBe('Servings must be a whole number from 1 to 100.')
  })

  it('servings:101 → Servings must be a whole number from 1 to 100.', () => {
    expect(recipeError({ ingredients: bowl, yield: { kind: 'servings' as const, servings: 101 } })).toBe('Servings must be a whole number from 1 to 100.')
  })

  it('bowl with servings:1 → null', () => {
    expect(recipeError({ ingredients: bowl, yield: { kind: 'servings' as const, servings: 1 } })).toBeNull()
  })
})

describe('recipeError yield.totalG', () => {
  it('batch totalG:0 → Enter the cooked weight in grams (1–20000).', () => {
    expect(recipeError({ ingredients: batch, yield: { kind: 'weight' as const, totalG: 0 } })).toBe('Enter the cooked weight in grams (1–20000).')
  })

  it('batch totalG:25000 → Enter the cooked weight in grams (1–20000).', () => {
    expect(recipeError({ ingredients: batch, yield: { kind: 'weight' as const, totalG: 25000 } })).toBe('Enter the cooked weight in grams (1–20000).')
  })

  it('batch totalG:1200 → null', () => {
    expect(recipeError({ ingredients: batch, yield: { kind: 'weight' as const, totalG: 1200 } })).toBeNull()
  })

  it('ingredient amount:0 → Check the ingredient amounts.', () => {
    const badIng: Ingredient[] = [{ food: chicken, amount: 0, unit: 'g' }]
    expect(recipeError({ ingredients: badIng, yield: { kind: 'servings' as const, servings: 1 } })).toBe('Check the ingredient amounts.')
    expect(recipeError({ ingredients: badIng, yield: { kind: 'weight' as const, totalG: 0 } })).toBe('Check the ingredient amounts.')
  })
})

describe('recipeFood servings', () => {
  it('yogurt bowl with servings:1', () => {
    const r = recipeFood({ ingredients: bowl, yield: { kind: 'servings' as const, servings: 1 } }, ' Yogurt bowl ', 'r1')
    expect(r.name).toBe('Yogurt bowl')
    expect(r.source).toBe('custom')
    expect(r.sourceId).toBe('r1')
    expect(r.servingG).toBe(278)
    expect(r.servingLabel).toBe('1 serving')
    expect(r.kcal100g).toBe(101.44)
    expect(r.protein100g).toBe(6.87)
    expect(r.sodiumMg100g).toBe(20.14)
    expect(r.fiber100g).toBe(0.65)
    expect(r.sugar100g).toBeNull()
    expect(r.extras100g).toEqual({ sodium_mg: 20.14, fiber_g: 0.65 })
  })

  it('batch with yield weight totalG=1200', () => {
    const r = recipeFood({ ingredients: batch, yield: { kind: 'weight' as const, totalG: 1200 } }, 'Chicken', 'r2')
    expect(r.kcal100g).toBe(141.5)
    expect(r.protein100g).toBe(18.15)
    expect(r.servingG).toBeNull()
    expect(r.servingLabel).toBeNull()
    expect(r.extras100g!.sodium_mg).toBe(187.92)
  })

  it('batch with yield servings=4', () => {
    const r = recipeFood({ ingredients: batch, yield: { kind: 'servings' as const, servings: 4 } }, 'Chicken', 'r3')
    expect(r.servingG).toBe(233.75)
    expect(r.kcal100g).toBe(181.6)
  })

  it('keeps recipe without source food.recipe field', () => {
    const srcFood = food({ name: 'X', kcal100g: 1, protein100g: 2, carbs100g: 3, fat100g: 4 }) as FoodResult & { recipe?: any }
    ;(srcFood.recipe = { test: true } as any)

    const ing: Ingredient[] = [{ food: srcFood, amount: 100, unit: 'g' }]
    const r = recipeFood({ ingredients: ing, yield: { kind: 'weight' as const, totalG: 100 } }, 'Test', 'rt')
    expect(r.recipe).toBeDefined()
    expect(r.recipe!.yield).toEqual({ kind: 'weight' as const, totalG: 100 })
    expect(r.recipe!.ingredients.length).toBe(1)
    expect(r.recipe!.ingredients[0].food.name).toBe('X')
    expect((r.recipe!.ingredients[0].food as any).recipe).toBeUndefined()
  })
})

describe('cleanRecipe', () => {
  it('deep-equals the same recipe after stringify', () => {
    const raw = JSON.parse(JSON.stringify({ ingredients: bowl, yield: { kind: 'servings', servings: 1 } }))
    expect(cleanRecipe(raw)).toEqual(raw)
  })

  it('null for null input', () => {
    expect(cleanRecipe(null)).toBeNull()
  })

  it("null for {}", () => {
    expect(cleanRecipe({})).toBeNull()
  })

  it("null when ingredients is not an array", () => {
    expect(cleanRecipe({ ingredients: 'x', yield: { kind: 'servings' as const, servings: 1 } })).toBeNull()
  })

  it('null for ingredient amount:0', () => {
    expect(cleanRecipe({ ingredients: [{ food: chicken, amount: 0, unit: 'g' }], yield: { kind: 'servings' as const, servings: 1 } })).toBeNull()
  })

  it("null when unit is not 'g' or 'serving'", () => {
    expect(cleanRecipe({ ingredients: [{ food: chicken, amount: 100, unit: 'cup' }], yield: { kind: 'servings' as const, servings: 1 } })).toBeNull()
  })

  it("null when yield has unknown kind", () => {
    expect(cleanRecipe({ ingredients: [{ food: chicken, amount: 100, unit: 'g' }], yield: { kind: 'x' as any } })).toBeNull()
  })

  it('null when food.kcal100g is not a number', () => {
    expect(cleanRecipe({ ingredients: [{ food: { ...chicken, kcal100g: 'a' } as any, amount: 100, unit: 'g' }], yield: { kind: 'servings' as const, servings: 1 } })).toBeNull()
  })
})
