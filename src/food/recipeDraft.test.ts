import { describe, it, expect } from 'vitest'
import type { FoodResult } from './types'
import { readAmount, startAmount, ingredientLine, yieldFrom } from './recipeDraft'

function food(overrides: Partial<FoodResult> = {}): FoodResult {
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

describe('readAmount', () => {
  it("returns 2 for '2'", () => {
    expect(readAmount('2')).toBe(2)
  })

  it("returns 0.5 for ' 0,5 '", () => {
    expect(readAmount(' 0,5 ')).toBe(0.5)
  })

  it("returns null for ''", () => {
    expect(readAmount('')).toBe(null)
  })

  it("returns null for '0'", () => {
    expect(readAmount('0')).toBe(null)
  })

  it("returns null for '-1'", () => {
    expect(readAmount('-1')).toBe(null)
  })

  it("returns null for 'abc'", () => {
    expect(readAmount('abc')).toBe(null)
  })
})

describe('startAmount', () => {
  it("returns { text: '1', unit: 'serving' } when food.servingG is set", () => {
    expect(startAmount(food({ servingG: 150 }))).toEqual({ text: '1', unit: 'serving' })
  })

  it("returns { text: '100', unit: 'g' } when food.servingG is not set", () => {
    expect(startAmount(food({}))).toEqual({ text: '100', unit: 'g' })
  })
})

describe('ingredientLine', () => {
  it("returns '0.5 × 1 cup · 52 cal'", () => {
    const result = ingredientLine({ food: food({ kcal100g: 53, servingG: 196, servingLabel: '1 cup' }), amount: 0.5, unit: 'serving' })
    expect(result).toBe('0.5 × 1 cup · 52 cal')
  })

  it("returns '30 g · 141 cal'", () => {
    const result = ingredientLine({ food: food({ kcal100g: 471 }), amount: 30, unit: 'g' })
    expect(result).toBe('30 g · 141 cal')
  })

  it("returns '1 × serving · 105 cal' when no servingLabel", () => {
    const result = ingredientLine({ food: food({ kcal100g: 300, servingG: 35 }), amount: 1, unit: 'serving' })
    expect(result).toBe('1 × serving · 105 cal')
  })
})

describe('yieldFrom', () => {
  it("returns { kind: 'servings', servings: 4 } for 'servings', '4'", () => {
    expect(yieldFrom('servings', '4')).toEqual({ kind: 'servings', servings: 4 })
  })

  it("returns { kind: 'weight', totalG: 1200 } for 'weight', '1200'", () => {
    expect(yieldFrom('weight', '1200')).toEqual({ kind: 'weight', totalG: 1200 })
  })

  it("has totalG NaN for 'weight', ''", () => {
    const result = yieldFrom('weight', '')
    expect(result.kind).toBe('weight')
    expect(result.kind === 'weight' && Number.isNaN(result.totalG)).toBe(true)
  })
})
