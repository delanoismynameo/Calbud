import { describe, it, expect } from 'vitest'
import type { MealPrep } from '../prep/types'
import { prepEvents } from './prepExport'

interface PrepOverrides {
  id?: string
  title?: string
  scheduled_date?: string
  start_time?: string | null
  duration_min?: number
  notes?: string | null
}

function prep(overrides: PrepOverrides = {}): MealPrep {
  return {
    id: 'p1',
    household_id: 'hh',
    created_by: null,
    title: 'Chicken curry',
    recipe_url: null,
    scheduled_date: '2026-10-27',
    start_time: null,
    duration_min: 60,
    status: 'planned',
    servings: 4,
    ingredients: [],
    notes: null,
    created_at: '',
    food_id: null,
    foods: null,
    photo_url: null,
    ...overrides,
  }
}

describe('prepEvents', () => {
  it('maps a timed prep session correctly', () => {
    const result = prepEvents(
      [prep({ start_time: '18:00:00', duration_min: 90, notes: 'legs' })],
      false,
    )
    expect(result).toEqual([
      { uid: 'prep-p1', title: 'Chicken curry', date: '2026-10-27', startTime: '18:00', durationMin: 90, notes: 'legs' },
    ])
  })

  it('untimed prep gives null start time and keeps notes null', () => {
    const result = prepEvents([prep({ duration_min: 0 })], false)
    expect(result[0].startTime).toBeNull()
    expect(result[0].durationMin).toBe(0)
    expect(result[0].notes).toBeUndefined()
  })

  it('prepEvents always keeps the original title (no names in meal prep)', () => {
    const result = prepEvents([prep()], true)
    expect(result[0].title).toBe('Chicken curry')
  })

  it('orders by date then start time, timed before untimed', () => {
    const items = [
      prep({ id: 'n', scheduled_date: '2026-10-28', start_time: null }),
      prep({ id: 'b', scheduled_date: '2026-10-27', start_time: '19:00:00' }),
      prep({ id: 'a', scheduled_date: '2026-10-27', start_time: '07:30:00' }),
      prep({ id: 'c', scheduled_date: '2026-10-27', start_time: null }),
    ]
    expect(prepEvents(items, false).map((e) => e.uid)).toEqual([
      'prep-a',
      'prep-b',
      'prep-c',
      'prep-n',
    ])
    // Input is not mutated
    expect(items[0].id).toBe('n')
  })

  it('empty array returns empty array', () => {
    expect(prepEvents([], false)).toEqual([])
  })
})
