import { describe, it, expect } from 'vitest'
import type { FoodResult } from './types'
import { applyLabelEdit, applyServingEdit, editUnit } from './labelEdit'

const base: FoodResult = {
  source: 'off',
  sourceId: '123',
  name: 'Test',
  brand: null,
  servingG: 31,
  servingLabel: '6 pieces',
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

describe('applyLabelEdit', () => {
  it('updates fat100g correctly (test a)', () => {
    const result = applyLabelEdit(base, 'fat', 3, 31)
    expect(result.fat100g).toBe(9.68)
  })

  it('updates kcal100g correctly (test b)', () => {
    const result = applyLabelEdit(base, 'kcal', 140, 240)
    expect(result.kcal100g).toBe(58.33)
  })

  it('handles sodium_mg with extra fields (test c)', () => {
    const result = applyLabelEdit(base, 'sodium_mg', 120, 240)
    expect(result.extras100g?.sodium_mg).toBe(50)
    expect(result.sodiumMg100g).toBe(50)
    expect(result.extras100g?.sat_fat_g).toBe(4)
  })

  it('updates protein100g correctly (test d)', () => {
    const result = applyLabelEdit(base, 'protein', 13, 240)
    expect(result.protein100g).toBe(5.42)
  })

  it('returns same object when grams is 0 (test e)', () => {
    const result = applyLabelEdit(base, 'fat', 3, 0)
    expect(result).toBe(base)
  })

  it('returns same object when value is negative (test f)', () => {
    const result = applyLabelEdit(base, 'fat', -3, 31)
    expect(result).toBe(base)
  })

  it('original base is not changed after edit (test g)', () => {
    applyLabelEdit(base, 'fat', 3, 31)
    expect(base.fat100g).toBe(9.7)
  })
})

describe('editUnit', () => {
  it('returns kcal for kcal key (test h)', () => {
    expect(editUnit('kcal')).toBe('kcal')
  })

  it('returns g for fat key (test h)', () => {
    expect(editUnit('fat')).toBe('g')
  })

  it('returns mg for sodium_mg key (test h)', () => {
    expect(editUnit('sodium_mg')).toBe('mg')
  })
})

describe('applyServingEdit', () => {
  it('applies serving with trimmed label', () => {
    const result = applyServingEdit(base, ' 1 cup ', 240)
    expect(result.servingG).toBe(240)
    expect(result.servingLabel).toBe('1 cup')
  })

  it('sets servingLabel to null for blank label', () => {
    const result = applyServingEdit(base, '   ', 100)
    expect(result.servingLabel).toBeNull()
  })

  it('returns same object when grams is 0', () => {
    const result = applyServingEdit(base, '1 cup', 0)
    expect(result).toBe(base)
  })

  it('returns same object when grams is NaN', () => {
    const result = applyServingEdit(base, '1 cup', Number.NaN)
    expect(result).toBe(base)
  })

  it('returns same object when grams is negative', () => {
    const result = applyServingEdit(base, '1 cup', -10)
    expect(result).toBe(base)
  })

  it('does not modify original base', () => {
    const result = applyServingEdit(base, '1 cup', 100)
    expect(base.servingG).toBe(31)
    expect(base.servingLabel).toBe('6 pieces')
  })
})
