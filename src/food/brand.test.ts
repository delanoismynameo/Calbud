import { describe, it, expect } from 'vitest'
import { matchesBrand, brandQuery } from './brand'
import type { FoodResult } from './types'

function food(name: string, brand: string | null): FoodResult {
  return {
    source: 'usda', sourceId: name, name, brand, servingG: null, servingLabel: null, unit: 'g',
    kcal100g: 100, protein100g: 1, carbs100g: 1, fat100g: 1, fiber100g: null, sugar100g: null, sodiumMg100g: null, barcode: null,
  }
}

describe('matchesBrand', () => {
  it('ignores case and matches the start of a brand', () => {
    expect(matchesBrand('kirkland', food('Almonds', 'Kirkland Signature'))).toBe(true)
    expect(matchesBrand('KIRK', food('Almonds', 'Kirkland Signature'))).toBe(true)
    expect(matchesBrand('Great Value', food('Milk', 'GREAT VALUE'))).toBe(true)
  })

  it('finds the brand in the name when the brand field is the parent company or missing', () => {
    expect(matchesBrand('kirkland', food('Kirkland Signature, Strawberry Spread', 'Costco Companies Inc.'))).toBe(true)
    expect(matchesBrand('fairlife', food('Fairlife Milk', null))).toBe(true)
  })

  it('every brand word must match', () => {
    expect(matchesBrand('great value', food('Value Pack Milk', 'Kroger'))).toBe(false)
    expect(matchesBrand('chobani', food('Greek Yogurt', 'Fage'))).toBe(false)
    expect(matchesBrand('kirkland', food('Almonds', null))).toBe(false)
  })

  it('an empty brand matches nothing', () => {
    expect(matchesBrand('  ', food('Kirkland Almonds', 'Kirkland'))).toBe(false)
  })
})

describe('brandQuery', () => {
  it('requires each brand word and keeps the food words as they are', () => {
    expect(brandQuery('Kirkland Signature', ' greek yogurt ')).toBe('+kirkland +signature greek yogurt')
    expect(brandQuery("Ben & Jerry's", '')).toBe('+ben +jerry')
    expect(brandQuery('a', 'milk')).toBe('milk')
    expect(brandQuery('', '')).toBe('')
  })
})
