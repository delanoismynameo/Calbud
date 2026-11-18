import type { MealPrep } from '../prep/types'
import type { Activity } from '../activities/types'

export interface WeekRow {
  type: 'meal' | 'work'
  id: string
  title: string
  scheduled_date: string
  start_time: string | null
  detail: string
}

export function mealToRow(m: MealPrep): WeekRow {
  const parts: string[] = []
  if (m.start_time) parts.push(`Prep at ${m.start_time.slice(0, 5)}`)
  if (m.duration_min != null) parts.push(`${m.duration_min} min`)
  if (m.servings) parts.push(`${m.servings} servings`)
  return { type: 'meal', id: m.id, title: m.title, scheduled_date: m.scheduled_date, start_time: m.start_time, detail: parts.join(' · ') }
}

export function activityToRow(a: Activity): WeekRow {
  const parts: string[] = []
  if (a.start_time) parts.push(a.start_time.slice(0, 5))
  if (a.duration_min != null) parts.push(`${a.duration_min} min`)
  if (a.kcal_burned != null) parts.push(`${a.kcal_burned} cal`)
  return { type: 'work', id: a.id, title: a.title, scheduled_date: a.scheduled_date, start_time: a.start_time, detail: parts.join(' · ') }
}

export function sortRows(rows: WeekRow[]): WeekRow[] {
  return [...rows].sort((a, b) => {
    const aHas = a.start_time != null
    const bHas = b.start_time != null
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    if (aHas && bHas) return a.start_time!.localeCompare(b.start_time!)
    return 0
  })
}

export const rowIcon = { meal: '🥝', work: '🏃' } as const
export const rowLabel = { meal: 'Meal Prep', work: 'Workout' } as const
