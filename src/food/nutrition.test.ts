import { describe, it, expect } from 'vitest'
import { scaleNutrition } from './nutrition'

const FOOD = {
  source: 'off' as const,
  sourceId: 'test',
  name: 'Test Food',
  brand: null,
  servingG: null,
  servingLabel: null,
  kcal100g: 143,
  protein100g: 12.6,
  carbs100g: 25.0,
  fat100g: 7.0,
  fiber100g: null,
  sugar100g: null,
  sodiumMg100g: null,
  barcode: null,
}

describe('scaleNutrition', () => {
  it('scales correctly for 150 g of a food with 143 kcal / 12.6 g protein per 100 g', () => {
    const result = scaleNutrition(FOOD, 150)
    expect(result.kcal).toBe(215) // 143 * 150 / 100 = 214.5 → round to 215 (actually wait: Math.round(214.5) = 215 in JS? Let me check... Actually in JavaScript, Math.round uses "round half away from zero" so 214.5 rounds to 215? No wait - JS uses "round half to even": but actually per the spec, Math.round(214.5) = 215. That's correct.)
    expect(result.protein_g).toBe(18.9) // 12.6 * 150 / 100 = 18.9
  })

  it('rounding works for kcal', () => {
    const food = { ...FOOD, kcal100g: 143 }
    expect(scaleNutrition(food, 33).kcal).toBe(47) // 143 * 0.33 = 47.19 → 47

    const food2 = { ...FOOD, kcal100g: 151 }
    expect(scaleNutrition(food2, 67).kcal).toBe(101) // 151 * 0.67 = ~101.17 → 101
  })

  it('rounding works for macros', () => {
    const food = { ...FOOD, protein100g: 3.333333 }
    expect(scaleNutrition(food, 33).protein_g).toBe(1.1) // 3.333333 * 0.33 = ~1.1 → 1.1

    const food2 = { ...FOOD, carbs100g: 7.7777 }
    expect(scaleNutrition(food2, 67).carbs_g).toBe(5.2) // ~5.2
  })

  it('throws on 0', () => {
    expect(() => scaleNutrition(FOOD, 0)).toThrow(RangeError)
  })

  it('throws on a negative number', () => {
    expect(() => scaleNutrition(FOOD, -10)).toThrow(RangeError)
  })

  it('throws on NaN', () => {
    expect(() => scaleNutrition(FOOD, NaN)).toThrow(RangeError)
  })
})
