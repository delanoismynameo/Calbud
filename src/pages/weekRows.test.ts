import { describe, it, expect } from 'vitest'
import type { MealPrep } from '../prep/types'
import type { Activity } from '../activities/types'
import { mealToRow, activityToRow, sortRows, rowIcon, rowLabel } from './weekRows'

function meal(overrides: Partial<MealPrep> = {}): MealPrep {
  return {
    id: 'm1',
    household_id: 'h',
    created_by: 'me',
    title: 'Oatmeal Cups',
    recipe_url: null,
    scheduled_date: '2026-11-18',
    start_time: '10:00:00',
    duration_min: 30,
    status: 'planned',
    servings: 6,
    ingredients: [],
    notes: null,
    created_at: '',
    food_id: null,
    foods: null,
    ...overrides,
  }
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'w1',
    user_id: 'me',
    title: 'Run 5K',
    scheduled_date: '2026-11-18',
    start_time: '09:00:00',
    duration_min: 60,
    kcal_burned: 520,
    completed: false,
    notes: null,
    created_at: '',
    ...overrides,
  }
}

describe('mealToRow', () => {
  it('builds a meal row with prep time, duration and servings', () => {
    const row = mealToRow(meal())
    expect(row).toEqual({
      type: 'meal',
      id: 'm1',
      title: 'Oatmeal Cups',
      scheduled_date: '2026-11-18',
      start_time: '10:00:00',
      detail: 'Prep at 10:00 · 30 min · 6 servings',
    })
  })

  it('omits start time and servings when null/zero, keeping duration', () => {
    const row = mealToRow(meal({ start_time: null, servings: 0 }))
    expect(row.detail).toBe('30 min')
  })
})

describe('activityToRow', () => {
  it('builds a work row with time, duration and kcal', () => {
    const row = activityToRow(activity())
    expect(row).toEqual({
      type: 'work',
      id: 'w1',
      title: 'Run 5K',
      scheduled_date: '2026-11-18',
      start_time: '09:00:00',
      detail: '09:00 · 60 min · 520 cal',
    })
  })

  it('omits start time and kcal when null, keeping duration', () => {
    const row = activityToRow(activity({ start_time: null, kcal_burned: null }))
    expect(row.detail).toBe('60 min')
  })
})

describe('sortRows', () => {
  it('orders by start time, no-time rows last, without mutating input', () => {
    const late = { ...mealToRow(meal({ id: 'm2' })), start_time: '18:00:00' }
    const early = { ...activityToRow(activity({ id: 'w2' })), start_time: '07:00:00' }
    const none1 = { ...mealToRow(meal({ id: 'm3', start_time: null })) }
    const none2 = { ...activityToRow(activity({ id: 'w3', start_time: null })) }
    const input = [late, none1, early, none2]
    const result = sortRows(input)
    expect(result.map(r => r.id)).toEqual(['w2', 'm2', 'm3', 'w3'])
    expect(input[0].id).toBe('m2')
  })
})

describe('rowIcon / rowLabel', () => {
  it('carries icons and labels for each type', () => {
    expect(rowIcon.meal).toBe('🥝')
    expect(rowIcon.work).toBe('🏃')
    expect(rowLabel.meal).toBe('Meal Prep')
    expect(rowLabel.work).toBe('Workout')
  })
})
