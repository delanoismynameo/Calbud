import { describe, it, expect } from 'vitest'
import { repeatPrepRows } from './repeat'
import type { MealPrep } from './types'

function prep(o: Partial<MealPrep> = {}): MealPrep {
  return {
    id: 'p1', household_id: 'h1', created_by: null, title: 'Curry', recipe_url: null,
    scheduled_date: '2026-03-01', start_time: '17:00:00', duration_min: 60, status: 'planned',
    servings: 4, ingredients: [{ name: 'rice', qty: 2, unit: 'cup' }], notes: null,
    created_at: '2026-02-20T10:00:00Z', food_id: 'f1', foods: null, ...o,
  }
}

describe('repeatPrepRows', () => {
  it("test 6: a session Curry on 2026-03-01 (start_time '17:00:00', 60 min, 4 servings, one ingredient, food_id: 'f1') becomes the same fields on 2026-03-08, with food_id: 'f1'", () => {
    const result = repeatPrepRows([prep()], [])
    expect(result).toEqual([{
      title: 'Curry', scheduled_date: '2026-03-08', start_time: '17:00:00',
      duration_min: 60, servings: 4, recipe_url: null,
      ingredients: [{ name: 'rice', qty: 2, unit: 'cup' }], notes: null, food_id: 'f1',
    }])
  })

  it("test 7: skipped when thisWeek has a session titled Curry on 2026-03-08, but kept when the existing Curry is on a different date, or another title is on that date", () => {
    const curried = prep()
    // Scenario A: duplicate title+date → skipped
    const thisWeekA = [prep({ id: 'x', title: 'Curry', scheduled_date: '2026-03-08' })]
    expect(repeatPrepRows([curried], thisWeekA)).toEqual([])

    // Scenario B: same title on different date → kept
    const curriedB = prep({ scheduled_date: '2026-03-01' })  // → 2026-03-08, title Curry
    const thisWeekB = [prep({ id: 'y', scheduled_date: '2026-03-10' })]  // different date, no conflict
    expect(repeatPrepRows([curriedB], thisWeekB).length).toBe(1)

    // Scenario C: another title on the new date → kept (need a non-Curry entry in thisWeek with that date)
    const curriedC = prep({ id: 'c2', scheduled_date: '2026-02-23' })  // → 2026-03-02, title Curry
    const thisWeekC = [prep({ id: 'z', title: 'Risotto', scheduled_date: '2026-03-08' })]
    expect(repeatPrepRows([curried], thisWeekC).length).toBe(1)
  })

  it("test 8: month boundary — 2026-02-27 becomes 2026-03-06", () => {
    const result = repeatPrepRows([prep({ scheduled_date: '2026-02-27' })], [])
    expect(result[0].scheduled_date).toBe('2026-03-06')
  })
})
