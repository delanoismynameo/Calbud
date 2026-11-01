import { describe, it, expect } from 'vitest'
import { groceryList, formatGroceryItem, groceryKey, filterGroceryItems, missingPlanItems } from './grocery'

describe('groceryList', () => {
  it('empty input returns empty output', () => {
    expect(groceryList([])).toEqual([])
  })

  it('merges same ingredient across lists with plural-to-singular unit conversion', () => {
    const result = groceryList([
      [{ name: 'rice', qty: 2, unit: 'cup' }],
      [{ name: 'Rice', qty: 1, unit: 'cups' }],
    ])
    expect(result).toEqual([{ name: 'rice', qty: 3, unit: 'cup' }])
  })

  it('merges ingredients in the same list', () => {
    const result = groceryList([[
      { name: 'eggs', qty: 3, unit: '' },
      { name: 'eggs', qty: 2, unit: '' },
    ]])
    expect(result).toEqual([{ name: 'eggs', qty: 5, unit: '' }])
  })

  it('keeps same name with different units separate', () => {
    const result = groceryList([[
      { name: 'chicken', qty: 1, unit: 'lb' },
      { name: 'chicken', qty: 200, unit: 'g' },
    ]])
    expect(result).toEqual([
      { name: 'chicken', qty: 1, unit: 'lb' },
      { name: 'chicken', qty: 200, unit: 'g' },
    ])
  })

  it('merges same ingredient with null qty across lists', () => {
    const result = groceryList([
      [{ name: 'salt', qty: null, unit: '' }],
      [{ name: 'salt', qty: null, unit: '' }],
    ])
    expect(result).toEqual([{ name: 'salt', qty: null, unit: '' }])
  })

  it('keeps number and null qty separate for same name', () => {
    const result = groceryList([[
      { name: 'garlic', qty: null, unit: '' },
      { name: 'garlic', qty: 2, unit: 'cloves' },
    ]])
    expect(result).toEqual([
      { name: 'garlic', qty: 2, unit: 'clove' },
      { name: 'garlic', qty: null, unit: '' },
    ])
  })

  it('rounds decimal sums', () => {
    const result = groceryList([[
      { name: 'oil', qty: 0.1, unit: 'cup' },
      { name: 'oil', qty: 0.2, unit: 'cup' },
    ]])
    expect(result[0].qty).toBe(0.3)
  })

  it('sorts by lowercased name A-Z', () => {
    const result = groceryList([[
      { name: 'onion', qty: 1, unit: '' },
      { name: 'Basil', qty: null, unit: '' },
      { name: 'carrot', qty: 2, unit: '' },
    ]])
    expect(result.map(i => i.name)).toEqual(['Basil', 'carrot', 'onion'])
  })
})

describe('formatGroceryItem', () => {
  it('formats items with qty+unit, qty only, and name only', () => {
    expect(formatGroceryItem({ name: 'rice', qty: 2.5, unit: 'cup' })).toBe('2.5 cup rice')
    expect(formatGroceryItem({ name: 'eggs', qty: 3, unit: '' })).toBe('3 eggs')
    expect(formatGroceryItem({ name: 'salt', qty: null, unit: '' })).toBe('salt')
  })
})

describe('groceryKey', () => {
  it('normalizes name and encodes null check', () => {
    expect(groceryKey({ name: ' Rice ', qty: 3, unit: 'cup' })).toBe('rice|cup|q')
    expect(groceryKey({ name: 'salt', qty: null, unit: '' })).toBe('salt||n')
  })
})

describe('filterGroceryItems', () => {
  it('correctly filters items into activeItems and boughtItems', () => {
    const items = [
      { name: 'rice', qty: 3, unit: 'cup' },
      { name: 'pasta', qty: 1, unit: 'box' },
      { name: 'extra', qty: 1, unit: 'unit' },
    ]
    const tickedKeys = new Set([groceryKey({ name: 'pasta', qty: 1, unit: 'box' })])

    const result = filterGroceryItems(items, tickedKeys)

    expect(result.activeItems).toEqual([
      { name: 'rice', qty: 3, unit: 'cup' },
      { name: 'extra', qty: 1, unit: 'unit' },
    ])
    expect(result.boughtItems).toEqual([{ name: 'pasta', qty: 1, unit: 'box' }])
  })

  it('returns empty arrays when no items', () => {
    const result = filterGroceryItems([], new Set())
    expect(result.activeItems).toEqual([])
    expect(result.boughtItems).toEqual([])
  })

  it('handles all items bought', () => {
    const items = [
      { name: 'rice', qty: 3, unit: 'cup' },
      { name: 'pasta', qty: 1, unit: 'box' },
    ]
    const tickedKeys = new Set([
      groceryKey({ name: 'rice', qty: 3, unit: 'cup' }),
      groceryKey({ name: 'pasta', qty: 1, unit: 'box' }),
    ])

    const result = filterGroceryItems(items, tickedKeys)

    expect(result.activeItems).toEqual([])
    expect(result.boughtItems).toEqual([
      { name: 'rice', qty: 3, unit: 'cup' },
      { name: 'pasta', qty: 1, unit: 'box' },
    ])
  })

  it('handles no items bought', () => {
    const items = [
      { name: 'rice', qty: 3, unit: 'cup' },
      { name: 'pasta', qty: 1, unit: 'box' },
    ]

    const result = filterGroceryItems(items, new Set())

    expect(result.activeItems).toEqual([
      { name: 'rice', qty: 3, unit: 'cup' },
      { name: 'pasta', qty: 1, unit: 'box' },
    ])
    expect(result.boughtItems).toEqual([])
  })
})

describe('missingPlanItems', () => {
  it('merges the sessions and skips what is already listed', () => {
    const plan = [
      [{ name: 'rice', qty: 1, unit: 'cup' }, { name: 'tofu', qty: 2, unit: '' }],
      [{ name: 'rice', qty: 2, unit: 'cup' }],
    ]
    const listed = [{ name: 'Tofu', qty: 2, unit: '' }]
    expect(missingPlanItems(plan, listed)).toEqual([{ name: 'rice', qty: 3, unit: 'cup' }])
  })

  it('returns nothing once everything is on the list', () => {
    const plan = [[{ name: 'rice', qty: 1, unit: 'cup' }]]
    expect(missingPlanItems(plan, [{ name: 'rice', qty: 1, unit: 'cup' }])).toEqual([])
  })
})
