import { describe, it, expect } from 'vitest'
import type { FoodResult } from './types'
import { foodKey, favoriteRow, withoutFavorites } from './favorites'

const usdaFood: FoodResult = {
  source: 'usda',
  sourceId: '456789',
  name: 'Oatmeal',
  brand: null,
  servingG: 240,
  servingLabel: '1 cup',
  kcal100g: 389,
  protein100g: 16.9,
  carbs100g: 66.3,
  fat100g: 6.9,
  fiber100g: 10.6,
  sugar100g: 0.0,
  sodiumMg100g: 1,
  barcode: null,
}

describe('foodKey', () => {
  it("gives 'usda:456789' for a usda food with sourceId '456789'", () => {
    const result = foodKey(usdaFood)
    expect(result).toBe('usda:456789')
  })

  it("gives 'off:bar-xyz' for an off food with sourceId 'bar-xyz'", () => {
    const offFood: FoodResult = { ...usdaFood, source: 'off', sourceId: 'bar-xyz' }
    expect(foodKey(offFood)).toBe('off:bar-xyz')
  })
})

describe('favoriteRow', () => {
  it("has is_favorite: true, household_id: 'h1', and the same name, source and source_id as the food", () => {
    const result = favoriteRow(usdaFood, 'h1', true) as {
      household_id: string
      source: string
      source_id: string | null
      name: string
      is_favorite: boolean
    }
    expect(result.is_favorite).toBe(true)
    expect(result.household_id).toBe('h1')
    expect(result.name).toBe(usdaFood.name)
    expect(result.source).toBe(usdaFood.source as string)
    expect(result.source_id).toBe(usdaFood.sourceId)
  })

  it("has is_favorite: false", () => {
    const result = favoriteRow(usdaFood, 'h1', false) as { is_favorite: boolean }
    expect(result.is_favorite).toBe(false)
  })
})

describe('withoutFavorites', () => {
  it("removes a recent that's also a favorite and keeps the others in order", () => {
    const b: FoodResult = { ...usdaFood, sourceId: 'bbb', name: 'Banana' }
    const recents = [usdaFood, b]
    const favorites: FoodResult[] = [usdaFood]

    const result = withoutFavorites(recents, favorites)
    expect(result).toHaveLength(1)
    expect(result[0].sourceId).toBe('bbb')
  })

  it("with no favorites returns all recents unchanged", () => {
    const a: FoodResult = { ...usdaFood, sourceId: 'aaa', name: 'Apple' }
    const recents = [a, usdaFood]
    const result = withoutFavorites(recents, [])
    expect(result).toHaveLength(2)
    expect(result[0].sourceId).toBe('aaa')
    expect(result[1].name).toBe(usdaFood.name)
  })

  it("a usda food and an off food with the same sourceId are different foods", () => {
    const usdaF: FoodResult = { ...usdaFood, sourceId: 'same-id' }
    const offF: FoodResult = { ...usdaFood, source: 'off', sourceId: 'same-id', name: 'OffItem' }
    const recents = [usdaF]
    const favorites = [offF]

    const result = withoutFavorites(recents, favorites)
    expect(result).toHaveLength(1)
    expect(result[0].sourceId).toBe('same-id')
  })
})
