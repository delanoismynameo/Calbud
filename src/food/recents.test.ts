import { describe, it, expect } from 'vitest'
import type { FoodRowFromDb } from './recents'
import { foodResultFromRow, recentFoods } from './recents'

const usdaRow: FoodRowFromDb = {
  id: 'food-1',
  household_id: 'hh-1',
  source: 'usda',
  source_id: '123456',
  name: 'Oatmeal',
  brand: null,
  serving_g: 240,
  serving_label: '1 cup',
  kcal_100g: 389,
  protein_100g: 16.9,
  carbs_100g: 66.3,
  fat_100g: 6.9,
  fiber_100g: 10.6,
  sugar_100g: 0.0,
  sodium_mg_100g: 1,
  is_favorite: false,
}

describe('foodResultFromRow', () => {
  it('converts a usda row: every field has the right value', () => {
    const result = foodResultFromRow(usdaRow)
    expect(result.source).toBe('usda')
    expect(result.sourceId).toBe('123456')
    expect(result.barcode).toBeNull()
    expect(result.name).toBe('Oatmeal')
    expect(result.brand).toBeNull()
    expect(result.servingG).toBe(240)
    expect(result.servingLabel).toBe('1 cup')
    expect(result.kcal100g).toBe(389)
    expect(result.protein100g).toBe(16.9)
    expect(result.carbs100g).toBe(66.3)
    expect(result.fat100g).toBe(6.9)
    expect(result.fiber100g).toBe(10.6)
    expect(result.sugar100g).toBe(0.0)
    expect(result.sodiumMg100g).toBe(1)
  })

  it('an off row gets barcode equal to its source_id', () => {
    const offRow: FoodRowFromDb = { ...usdaRow, source: 'off', source_id: 'bar-xyz' }
    const result = foodResultFromRow(offRow)
    expect(result.source).toBe('off')
    expect(result.barcode).toBe('bar-xyz')
  })

  it('string numbers become numbers', () => {
    const strRow: FoodRowFromDb = {
      ...usdaRow,
      kcal_100g: Number('71'),
      protein_100g: Number('2.5'),
      sugar_100g: null,
      fiber_100g: null,
      sodium_mg_100g: null,
    }
    const result = foodResultFromRow(strRow)
    expect(result.kcal100g).toBe(71)
    expect(typeof result.kcal100g).toBe('number')
    expect(result.sugar100g).toBeNull()
  })
})

describe('recentFoods', () => {
  type Row = { food_id: string | null; foods: FoodRowFromDb | null }

  it('keeps newest-first order', () => {
    const b: FoodRowFromDb = { ...usdaRow, id: 'b', source_id: 'b' }
    const a: FoodRowFromDb = { ...usdaRow, id: 'a', source_id: 'a' }
    const rows: Row[] = [
      { food_id: 'log-2', foods: b },
      { food_id: 'log-1', foods: a },
    ]
    const result = recentFoods(rows)
    expect(result[0].sourceId).toBe('b')
    expect(result[1].sourceId).toBe('a')
  })

  it('same food twice appears once, at the position of its newest log', () => {
    const base: FoodRowFromDb = { ...usdaRow, id: 'food-a', source_id: 'x' }
    const rows: Row[] = [
      { food_id: 'log-new', foods: base },
      { food_id: 'log-old', foods: base },
    ]
    const result = recentFoods(rows)
    expect(result).toHaveLength(1)
  })

  it('rows with foods: null are skipped', () => {
    const rows: Row[] = [
      { food_id: 'log-1', foods: { ...usdaRow, id: 'f1', source_id: 'a' } },
      { food_id: 'log-2', foods: null },
      { food_id: 'log-3', foods: { ...usdaRow, id: 'f2', source_id: 'z' } },
    ]
    const result = recentFoods(rows)
    expect(result).toHaveLength(2)
  })

  it('custom foods are skipped', () => {
    const custom: FoodRowFromDb = { ...usdaRow, id: 'cust-1', source_id: '', source: 'custom' }
    const usda2: FoodRowFromDb = { ...usdaRow, id: 'u-1', source_id: 'u1', source: 'usda' }
    const rows: Row[] = [
      { food_id: 'log-1', foods: custom },
      { food_id: 'log-2', foods: usda2 },
    ]
    const result = recentFoods(rows)
    expect(result).toHaveLength(1)
  })

  it('limit is respected: 12 different foods with limit 10 gives 10', () => {
    const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
      food_id: `log-${i}`,
      foods: { ...usdaRow, id: `food-${i}`, source_id: String(i), name: `Food ${i}` } as FoodRowFromDb,
    }))
    const result = recentFoods(rows, 10)
    expect(result).toHaveLength(10)
  })

  it('empty array gives []', () => {
    const result = recentFoods([])
    expect(result).toEqual([])
  })
})
