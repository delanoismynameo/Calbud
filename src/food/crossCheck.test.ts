import { describe, it, expect } from 'vitest'
import type { FoodResult, FoodSource } from './types'
import { sourceMismatch, sourceLabel } from './crossCheck'

const base: FoodResult = {
  source: 'off',
  sourceId: '123',
  name: 'Test',
  brand: null,
  servingG: 31,
  servingLabel: '6 pieces',
  unit: 'g',
  kcal100g: 419,
  protein100g: 0,
  carbs100g: 80,
  fat100g: 9.7,
  fiber100g: null,
  sugar100g: null,
  sodiumMg100g: null,
  barcode: '123',
  extras100g: { sat_fat_g: 4 },
}

function override(source: FoodSource, kcal100g: number): FoodResult {
  return { ...base, source, kcal100g }
}

describe('sourceMismatch', () => {
  it('off 336 vs usda 140 gives a string containing "Open Food Facts says 336" and "USDA says 140"', () => {
    const result = sourceMismatch(override('off', 336), override('usda', 140))
    expect(result).toContain('Open Food Facts says 336')
    expect(result).toContain('USDA says 140')
  })

  it('100 vs 110 gives null', () => {
    expect(sourceMismatch(override('off', 100), override('usda', 110))).toBe(null)
  })

  it('50 vs 30 gives a string', () => {
    expect(sourceMismatch(override('off', 50), override('usda', 30))).not.toBe(null)
  })

  it('400 vs 380 gives null', () => {
    expect(sourceMismatch(override('off', 400), override('usda', 380))).toBe(null)
  })

  it('0 vs 0 gives null', () => {
    expect(sourceMismatch(override('off', 0), override('usda', 0))).toBe(null)
  })
})

describe('sourceLabel', () => {
  it('usda returns "USDA" and off returns "Open Food Facts"', () => {
    expect(sourceLabel('usda')).toBe('USDA')
    expect(sourceLabel('off')).toBe('Open Food Facts')
  })
})
