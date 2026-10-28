import { describe, it, expect } from 'vitest'
import { parseIngredients, formatIngredients, UNITS } from './ingredients'

const cases: Array<{ input: string; result: { name: string; qty: number | null; unit: string } }> = [
  { input: '2 cup rice', result: { name: 'rice', qty: 2, unit: 'cup' } },
  { input: '1.5 lb chicken thighs', result: { name: 'chicken thighs', qty: 1.5, unit: 'lb' } },
  { input: '1/2 tsp salt', result: { name: 'salt', qty: 0.5, unit: 'tsp' } },
  { input: '3 eggs', result: { name: 'eggs', qty: 3, unit: '' } },
  { input: '2 Cans coconut milk', result: { name: 'coconut milk', qty: 2, unit: 'cans' } },
  { input: 'curry roux', result: { name: 'curry roux', qty: null, unit: '' } },
  { input: '2 cups', result: { name: '2 cups', qty: null, unit: '' } },
  { input: '0 g sugar', result: { name: '0 g sugar', qty: null, unit: '' } },
]

describe('parseIngredients', () => {
  for (const { input, result } of cases) {
    it(`"${input}" → ${JSON.stringify(result)}`, () => {
      const items = parseIngredients(input)
      expect(items).toHaveLength(1)
      expect(items[0]).toEqual(result)
    })
  }

  it('skips blank lines and surrounding spaces', () => {
    const result = parseIngredients('  \n\n2 cup rice\n\n3 eggs\n\n')
    expect(result).toHaveLength(2)
  })

  it('format of first, fourth, sixth results', () => {
    const items = parseIngredients(cases.map((c) => c.input).join('\n'))
    const formatted = formatIngredients([items[0], items[3], items[5]])
    expect(formatted).toBe('2 cup rice\n3 eggs\ncurry roux')
  })

  it('parse → format → parse returns same list', () => {
    const input = cases.map((c) => c.input).join('\n')
    const parsed1 = parseIngredients(input)
    const formatted = formatIngredients(parsed1)
    const parsed2 = parseIngredients(formatted)
    expect(parsed2).toEqual(parsed1)
  })
})

describe('UNITS', () => {
  it('includes all expected units', () => {
    expect(UNITS.includes('g')).toBe(true)
    expect(UNITS.includes('kg')).toBe(true)
    expect(UNITS.includes('oz')).toBe(true)
    expect(UNITS.includes('lb')).toBe(true)
    expect(UNITS.includes('lbs')).toBe(true)
    expect(UNITS.includes('cup')).toBe(true)
    expect(UNITS.includes('cups')).toBe(true)
    expect(UNITS.includes('tbsp')).toBe(true)
    expect(UNITS.includes('tsp')).toBe(true)
    expect(UNITS.includes('ml')).toBe(true)
    expect(UNITS.includes('l')).toBe(true)
    expect(UNITS.includes('can')).toBe(true)
    expect(UNITS.includes('cans')).toBe(true)
    expect(UNITS.includes('clove')).toBe(true)
    expect(UNITS.includes('cloves')).toBe(true)
    expect(UNITS.includes('pinch')).toBe(true)
  })
})
