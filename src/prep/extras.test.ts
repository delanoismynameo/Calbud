import { describe, it, expect } from 'vitest'
import { groceryKey } from './grocery'
import { mergeExtras, removeExtra } from './extras'
import type { GroceryItem } from './grocery'

describe('mergeExtras', () => {
  it('adds up the same item when name + unit overlap', () => {
    const existing: GroceryItem[] = [{ name: 'rice', qty: 2, unit: 'lb' }]
    const added: GroceryItem[] = [{ name: 'Rice', qty: 1, unit: 'lb' }]
    const result = mergeExtras(existing, added)
    expect(result).toEqual([{ name: 'rice', qty: 3, unit: 'lb' }])
  })

  it('keeps different items separate', () => {
    const existing: GroceryItem[] = [{ name: 'rice', qty: 1, unit: 'cup' }]
    const added: GroceryItem[] = [{ name: 'salt', qty: null, unit: '' }]
    const result = mergeExtras(existing, added)
    expect(result.length).toBe(2)
    expect(result.find(i => i.name === 'rice')).toBeTruthy()
    expect(result.find(i => i.name === 'salt')).toBeTruthy()
  })

  it('sorts by name', () => {
    const existing: GroceryItem[] = [{ name: 'zucchini', qty: 1, unit: '' }]
    const added: GroceryItem[] = [{ name: 'apple', qty: null, unit: '' }]
    const result = mergeExtras(existing, added)
    expect(result.map(i => i.name)).toEqual(['apple', 'zucchini'])
  })

  it('returns empty when both inputs are empty', () => {
    expect(mergeExtras([], [])).toEqual([])
  })

  it('keeps a counted item and an uncounted one of the same name separate', () => {
    const existing: GroceryItem[] = [{ name: 'milk', qty: null, unit: '' }]
    const added: GroceryItem[] = [{ name: 'Milk', qty: 2, unit: '' }]
    const result = mergeExtras(existing, added)
    expect(result).toEqual([{ name: 'Milk', qty: 2, unit: '' }, { name: 'milk', qty: null, unit: '' }])
  })
})

describe('removeExtra', () => {
  it('removes by key and leaves the rest', () => {
    const existing: GroceryItem[] = [
      { name: 'rice', qty: 1, unit: 'cup' },
      { name: 'salt', qty: null, unit: '' },
      { name: 'oil', qty: 2, unit: 'lb' },
    ]
    const result = removeExtra(existing, groceryKey({ name: ' salt ', qty: null, unit: '' }))
    expect(result.length).toBe(2)
    expect(result.find(i => i.name === 'salt')).toBeUndefined()
    expect(result.find(i => i.name === 'rice')).toBeTruthy()
  })

  it('returns same array when key matches nothing', () => {
    const existing: GroceryItem[] = [{ name: 'rice', qty: 1, unit: 'cup' }]
    const result = removeExtra(existing, 'nonexistent')
    expect(result).toEqual([{ name: 'rice', qty: 1, unit: 'cup' }])
  })
})
