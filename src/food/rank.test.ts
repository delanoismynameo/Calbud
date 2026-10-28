import { describe, it, expect } from 'vitest'
import { words, splitQuery, matchScore, rankResults } from './rank'
import type { FoodResult } from './types'

function food(
  name: string,
  brand: string | null = null,
): FoodResult {
  return {
    source: 'usda',
    sourceId: '0',
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

describe('words', () => {
  it("words('STEAMED MIXED VEGETABLES')", () => {
    expect(words('STEAMED MIXED VEGETABLES')).toEqual(['steamed', 'mixed', 'vegetable'])
  })

  it("words('Broccoli, cooked, from restaurant')", () => {
    expect(words('Broccoli, cooked, from restaurant')).toEqual(['broccoli', 'cooked', 'from', 'restaurant'])
  })

  it("words('  ')", () => {
    expect(words('  ')).toEqual([])
  })
})

describe('splitQuery', () => {
  it("'Steamed vegetables'", () => {
    expect(splitQuery('Steamed vegetables')).toEqual({ core: 'vegetables', methods: ['steamed'] })
  })

  it("'grilled chicken breast'", () => {
    expect(splitQuery('grilled chicken breast')).toEqual({ core: 'chicken breast', methods: ['grilled'] })
  })

  it("'oatmeal'", () => {
    expect(splitQuery('oatmeal')).toEqual({ core: 'oatmeal', methods: [] })
  })

  it("'steamed'", () => {
    expect(splitQuery('steamed')).toEqual({ core: 'steamed', methods: [] })
  })

  it("'  Raw  Broccoli '", () => {
    expect(splitQuery('  Raw  Broccoli ')).toEqual({ core: 'broccoli', methods: ['raw'] })
  })

  it("a repeated cooking word stays out of core ('steamed steamed broccoli')", () => {
    expect(splitQuery('steamed steamed broccoli')).toEqual({ core: 'broccoli', methods: ['steamed'] })
  })
})

describe('matchScore', () => {
  describe("query 'steamed vegetables'", () => {
    it("'STEAMED MIXED VEGETABLES' → 4", () => {
      expect(matchScore(food('STEAMED MIXED VEGETABLES'), 'steamed vegetables')).toBe(4)
    })

    it("'Classic mixed vegetables, cooked' → 3", () => {
      expect(matchScore(food('Classic mixed vegetables, cooked'), 'steamed vegetables')).toBe(3)
    })

    it("'Oysters, steamed' → 2", () => {
      expect(matchScore(food('Oysters, steamed'), 'steamed vegetables')).toBe(2)
    })

    it("'Babyfood, vegetables, mix vegetables junior' → 2 (vegetables counts once)", () => {
      expect(matchScore(food('Babyfood, vegetables, mix vegetables junior'), 'steamed vegetables')).toBe(2)
    })

    it("'Chicken breast tenders, uncooked' → 0", () => {
      expect(matchScore(food('Chicken breast tenders, uncooked'), 'steamed vegetables')).toBe(0)
    })
  })

  it("query 'raw broccoli', food 'Broccoli, cooked' → 2 (no cooked bonus for raw)", () => {
    expect(matchScore(food('Broccoli, cooked'), 'raw broccoli')).toBe(2)
  })

  it("query 'steamed vegetables', food 'Mixed blend' brand 'Steamed Veggie Co' → 2 (the brand counts)", () => {
    expect(matchScore(food('Mixed blend', 'Steamed Veggie Co'), 'steamed vegetables')).toBe(2)
  })
})

describe('rankResults', () => {
  it("sorts by matchScore highest first for query 'steamed vegetables'", () => {
    const input = [
      food('Oysters, steamed'),
      food('Fish, bass, steamed'),
      food('Classic mixed vegetables, cooked'),
      food('STEAMED MIXED VEGETABLES'),
    ]
    const query = 'steamed vegetables'

    const result = rankResults(input, query)

    expect(result.map(r => r.name)).toEqual([
      'STEAMED MIXED VEGETABLES',
      'Classic mixed vegetables, cooked',
      'Oysters, steamed',
      'Fish, bass, steamed',
    ])
  })

  it("ties keep input order: three foods that all score 0", () => {
    const input = [
      food('A'),
      food('B'),
      food('C'),
    ]

    const result = rankResults(input, 'steamed vegetables')

    expect(result.map(r => r.name)).toEqual(['A', 'B', 'C'])
  })

  it("does not change the input array", () => {
    const input = [
      food('Oysters, steamed'),
      food('Fish, bass, steamed'),
    ]
    const originalFirst = input[0]!

    rankResults(input, 'steamed vegetables')

    expect(input[0]).toBe(originalFirst)
    expect(input.length).toBe(2)
  })
})
