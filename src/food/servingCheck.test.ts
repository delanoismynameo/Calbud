import { describe, it, expect } from 'vitest'
import type { FoodResult } from './types'
import { servingWarning } from './servingCheck'

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

function overrideServing(g: number | null, label: string | null): FoodResult {
  return { ...base, servingG: g, servingLabel: label }
}

describe('servingWarning', () => {
  it('label \'6 pieces (31 g)\' with servingG 31 gives null', () => {
    expect(servingWarning(overrideServing(31, '6 pieces (31 g)'))).toBe(null)
  })

  it('label \'1 cup (240 g)\' with servingG 120 gives a string containing \'240 g\' and \'120 g\'', () => {
    const result = servingWarning(overrideServing(120, '1 cup (240 g)'))
    expect(result).toContain('240 g')
    expect(result).toContain('120 g')
  })

  it('label \'1 tablet (250 mg)\' with servingG 0.3 gives null', () => {
    expect(servingWarning(overrideServing(0.3, '1 tablet (250 mg)'))).toBe(null)
  })

  it('servingG null with label \'1 cup\' gives \'This serving has a name but no weight.\'', () => {
    expect(servingWarning(overrideServing(null, '1 cup'))).toBe('This serving has a name but no weight.')
  })

  it('servingG null with label null gives null', () => {
    expect(servingWarning(overrideServing(null, null))).toBe(null)
  })

  it('servingG 1500 with label null gives a string containing \'very large\'', () => {
    const result = servingWarning(overrideServing(1500, null))
    expect(result).toContain('very large')
  })

  it('label \'2 cookies\' with servingG 28 gives null', () => {
    expect(servingWarning(overrideServing(28, '2 cookies'))).toBe(null)
  })

  it('label \'30g\' with servingG 33 gives null', () => {
    expect(servingWarning(overrideServing(33, '30g'))).toBe(null)
  })

  it('label \'30g\' with servingG 40 gives a string containing \'30 g\'', () => {
    const result = servingWarning(overrideServing(40, '30g'))
    expect(result).toContain('30 g')
  })
})