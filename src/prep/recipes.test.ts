import { describe, it, expect } from 'vitest'
import type { MealPrep } from './types'
import { recipesFrom } from './recipes'

function h(partial: Partial<MealPrep>): MealPrep {
  return {
    id: partial.id ?? '00000000-0000-0000-0000-000000000000',
    household_id: partial.household_id ?? 'house-1',
    created_by: partial.created_by ?? 'user-1',
    title: partial.title ?? '',
    recipe_url: partial.recipe_url ?? null,
    scheduled_date: partial.scheduled_date ?? '2026-01-01',
    start_time: partial.start_time ?? null,
    duration_min: partial.duration_min ?? 30,
    status: partial.status ?? 'planned',
    servings: partial.servings ?? 2,
    ingredients: partial.ingredients ?? [{ name: '', qty: null, unit: '' }],
    notes: partial.notes ?? null,
    created_at: partial.created_at ?? '2026-01-01T00:00:00Z',
    food_id: partial.food_id ?? null,
    foods: partial.foods ?? null,
  }
}

describe('recipesFrom', () => {
  it('empty input returns empty output', () => {
    expect(recipesFrom([])).toEqual([])
  })

  it('two sessions with titles Curry and curry become one recipe with sessions: 2', () => {
    const result = recipesFrom([
      h({ title: 'Curry', scheduled_date: '2026-01-02' }),
      h({ title: ' curry ', scheduled_date: '2026-01-03' }),
    ])
    expect(result.length).toBe(1)
    expect(result[0].key).toBe('curry')
    expect(result[0].title).toBe('curry')
    expect(result[0].sessions).toBe(2)
  })

  it('made counts only done', () => {
    const result = recipesFrom([
      h({ title: 'Curry', scheduled_date: '2026-01-02', status: 'done' }),
      h({ title: ' curry ', scheduled_date: '2026-01-03', status: 'planned' }),
    ])
    expect(result[0].made).toBe(1)
  })

  it('the newest session\'s ingredients and servings win', () => {
    const result = recipesFrom([
      h({ title: 'Curry', scheduled_date: '2026-01-02', servings: 3, ingredients: [{ name: 'old', qty: 1, unit: '' }] }),
      h({ title: ' curry ', scheduled_date: '2026-01-03', servings: 4, ingredients: [{ name: 'new', qty: 2, unit: 'cup' }] }),
    ])
    expect(result[0].servings).toBe(4)
    expect(result[0].ingredients).toEqual([{ name: 'new', qty: 2, unit: 'cup' }])
  })

  it('sort order: lastDate descending, then title ascending', () => {
    const result = recipesFrom([
      h({ title: 'Avocado toast', scheduled_date: '2026-01-05' }),
      h({ title: 'Bagel', scheduled_date: '2026-01-04' }),
      h({ title: 'Apple pie', scheduled_date: '2026-01-04' }),
    ])
    expect(result.map(r => r.key)).toEqual(['avocado toast', 'apple pie', 'bagel'])
  })

  it('a blank title is skipped', () => {
    const result = recipesFrom([
      h({ title: '' }),
      h({ title: '   ' }),
      h({ title: 'Valid dish', scheduled_date: '2026-01-03' }),
    ])
    expect(result.length).toBe(1)
    expect(result[0].key).toBe('valid dish')
  })

  it('recipeUrl is the newest non-null url in the group', () => {
    const result = recipesFrom([
      h({ title: 'Curry', scheduled_date: '2026-01-03', recipe_url: null }),
      h({ title: ' curry ', scheduled_date: '2026-01-02', recipe_url: 'https://example.com/old' }),
    ])
    expect(result[0].recipeUrl).toBe('https://example.com/old')
  })

  it('recipeUrl from newest session wins over older non-null', () => {
    const result = recipesFrom([
      h({ title: 'Curry', scheduled_date: '2026-01-03', recipe_url: 'https://example.com/new' }),
      h({ title: ' curry ', scheduled_date: '2026-01-02', recipe_url: 'https://example.com/old' }),
    ])
    expect(result[0].recipeUrl).toBe('https://example.com/new')
  })

  it('title of newest session wins over older', () => {
    const result = recipesFrom([
      h({ title: 'Curry supreme', scheduled_date: '2026-01-03' }),
      h({ title: ' curry ', scheduled_date: '2026-01-02' }),
    ])
    expect(result[0].title).toBe('Curry supreme')
  })

  it('notes from newest session wins', () => {
    const result = recipesFrom([
      h({ title: 'Curry', scheduled_date: '2026-01-03', notes: 'new note' }),
      h({ title: ' curry ', scheduled_date: '2026-01-02', notes: 'old note' }),
    ])
    expect(result[0].notes).toBe('new note')
  })
})
