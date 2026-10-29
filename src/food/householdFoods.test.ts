import { describe, it, expect } from 'vitest'
import type { FoodResult } from './types'
import { matchesQuery, householdMatches, withoutHousehold } from './householdFoods'

function food(
  name: string,
  brand: string | null = null,
  sourceId: string = '0',
): FoodResult {
  return {
    source: 'usda',
    sourceId,
    name,
    brand,
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
  }
}

describe('matchesQuery', () => {
  it('matches when every query word is a prefix of at least one name word', () => {
    expect(matchesQuery(food('Curry'), 'curry')).toBe(true)
    expect(matchesQuery(food('Curry'), 'curr')).toBe(true)
    expect(matchesQuery(food('Curry'), 'pasta')).toBe(false)
  })

  it('handles multi-word names and queries', () => {
    expect(matchesQuery(food('Chicken and Potatoes'), 'chicken potato')).toBe(true)
    expect(matchesQuery(food('Chicken and Potatoes'), 'chicken rice')).toBe(false)
  })

  it('matches brand name', () => {
    expect(matchesQuery(food('Greek yogurt', 'Fage'), 'fage')).toBe(true)
  })
})

describe('householdMatches', () => {
  it('returns empty when query is too short', () => {
    expect(householdMatches([food('Curry')], 'c')).toEqual([])
  })

  it('sorts by matchScore, ties keep input order, respects limit', () => {
    const result = householdMatches([food('Curry'), food('Cur sauce')], 'cur')
    expect(result.map(f => f.name)).toEqual(['Cur sauce', 'Curry'])
  })

  it('returns up to limit foods', () => {
    const soups = Array.from({ length: 10 }, (_, i) => food('Soup ' + (i + 1)))
    const result = householdMatches(soups, 'soup')
    expect(result).toHaveLength(8)
    expect(result[0].name).toBe('Soup 1')
  })
})

describe('withoutHousehold', () => {
  it('removes foods that have the same foodKey', () => {
    expect(withoutHousehold([food('A', null, '1'), food('B', null, '2')], [food('A', null, '1')]).map(f => f.name)).toEqual(['B'])
  })
})
