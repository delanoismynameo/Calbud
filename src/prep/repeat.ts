import { addDays } from './week'
import type { MealPrep } from './types'
import type { PrepFields } from './types'

// Last week's sessions moved forward 7 days, as PrepFields plus food_id. Skip any session whose
// title AND new scheduled_date already exist in `thisWeek`. Status is not part of the result.
export function repeatPrepRows(lastWeek: MealPrep[], thisWeek: MealPrep[]): (PrepFields & { food_id: string | null })[] {
  const filled = new Set(thisWeek.map(s => `${s.title},${s.scheduled_date}`))
  return lastWeek
    .map(s => ({ ...s, scheduled_date: addDays(s.scheduled_date, 7) }))
    .filter(r => !filled.has(`${r.title},${r.scheduled_date}`))
    .map(s => ({
      title: s.title,
      scheduled_date: s.scheduled_date,
      start_time: s.start_time,
      duration_min: s.duration_min,
      servings: s.servings,
      recipe_url: s.recipe_url,
      ingredients: s.ingredients,
      notes: s.notes,
      food_id: s.food_id,
    }))
}
