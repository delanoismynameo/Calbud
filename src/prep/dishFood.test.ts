import { describe, it, expect } from 'vitest'
import type { FoodRowFromDb } from '../food/recents'
import { emptyDish, isDishBlank, dishFromFood, kcalPerServing, parseDish } from './dishFood'

function row(o: Partial<FoodRowFromDb> = {}): FoodRowFromDb {
  return {
    id: 'food-1',
    household_id: 'h-1',
    source: 'custom',
    source_id: null,
    name: 'Test dish',
    brand: null,
    serving_g: 350,
    serving_label: '1 serving',
    kcal_100g: 148.57,
    protein_100g: 8.57,
    carbs_100g: 15.71,
    fat_100g: 5.71,
    fiber_100g: null,
    sugar_100g: null,
    sodium_mg_100g: null,
    is_favorite: false,
    ...o,
  }
}

describe('isDishBlank', () => {
  it('emptyDish is blank', () => {
    expect(isDishBlank(emptyDish)).toBe(true)
  })

  it('whitespace-only kcal is blank', () => {
    expect(isDishBlank({ ...emptyDish, kcal: '  ' })).toBe(true)
  })

  it('a value in kcal makes it non-blank', () => {
    expect(isDishBlank({ ...emptyDish, kcal: '5' })).toBe(false)
  })
})

describe('dishFromFood', () => {
  it('uses default row values to produce correct nutrition', () => {
    expect(dishFromFood(row())).toEqual({ servingG: '350', kcal: '520', protein: '30', carbs: '55', fat: '20' })
  })

  it('returns emptyDish when serving_g is null', () => {
    expect(dishFromFood(row({ serving_g: null }))).toEqual(emptyDish)
  })
})

describe('kcalPerServing', () => {
  it('calculates kcal for default row', () => {
    expect(kcalPerServing(row())).toBe(520)
  })

  it('returns null when serving_g is null', () => {
    expect(kcalPerServing(row({ serving_g: null }))).toBe(null)
  })
})

describe('parseDish', () => {
  const validDish = { servingG: '350', kcal: '520', protein: '30', carbs: '55', fat: '20' }

  it('returns ok:true with correct food when dish is valid', () => {
    const result = parseDish('Curry', validDish, 'dish-1')
    expect(result).toEqual({
      ok: true,
      food: expect.objectContaining({
        name: 'Curry',
        source: 'custom',
        sourceId: 'dish-1',
        servingG: 350,
        servingLabel: '1 serving',
        kcal100g: 148.57,
      }),
    })
    expect(result.ok && result.food.name).toBe('Curry')
    expect(result.ok && result.food.source).toBe('custom')
    expect(result.ok && result.food.sourceId).toBe('dish-1')
    expect(result.ok && result.food.servingG).toBe(350)
    expect(result.ok && result.food.servingLabel).toBe('1 serving')
    expect(result.ok && result.food.kcal100g).toBe(148.57)
  })

  it('blank servingG gives an error on servingG only', () => {
    const result = parseDish('Test', { ...validDish, servingG: '' }, 'dish-2')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors)).toEqual(['servingG'])
    }
  })

  it('parseDish with empty title gives errors:{} when dish is otherwise valid', () => {
    const result = parseDish('', validDish, 'dish-3')
    expect(result).toEqual({ ok: false, errors: {} })
  })

  it("kcal: 'abc' gives an error on kcal", () => {
    const result = parseDish('Test', { ...validDish, kcal: 'abc' }, 'dish-4')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors)).toContain('kcal')
    }
  })
})
