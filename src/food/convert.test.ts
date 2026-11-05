import { describe, it, expect } from 'vitest'
import { convertUnits, convertAmount } from './convert'

const per = (unit: 'g' | 'ml', label: string) => {
  const found = convertUnits(unit).find((u) => u.label === label)
  if (!found) throw new Error(`no ${label}`)
  return found.per
}

describe('convertUnits', () => {
  it('offers weights for gram foods and no cups', () => {
    expect(convertUnits('g').map((u) => u.label)).toEqual(['pounds', 'ounces', 'kilograms'])
  })

  it('offers liquid measures for ml foods', () => {
    expect(convertUnits('ml').map((u) => u.label)).toEqual(['fl oz', 'cups', 'tablespoons', 'teaspoons'])
  })
})

describe('convertAmount', () => {
  it('turns pounds, ounces and kilograms into grams', () => {
    expect(convertAmount('1', per('g', 'pounds'))).toBe(453.6)
    expect(convertAmount('2.5', per('g', 'pounds'))).toBe(1134)
    expect(convertAmount('4', per('g', 'ounces'))).toBe(113.4)
    expect(convertAmount('1.5', per('g', 'kilograms'))).toBe(1500)
  })

  it('turns liquid measures into ml', () => {
    expect(convertAmount('1', per('ml', 'cups'))).toBe(236.6)
    expect(convertAmount('8', per('ml', 'fl oz'))).toBe(236.6)
    expect(convertAmount('1', per('ml', 'tablespoons'))).toBe(14.8)
    expect(convertAmount('3', per('ml', 'teaspoons'))).toBe(14.8)
  })

  it('accepts a comma as the decimal point', () => {
    expect(convertAmount('1,5', 1000)).toBe(1500)
  })

  it('finds nothing in blank, zero, negative or non-number text', () => {
    for (const text of ['', '  ', '0', '-1', 'abc']) expect(convertAmount(text, 1000)).toBeNull()
  })
})
