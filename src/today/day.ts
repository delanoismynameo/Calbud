import type { MealLog } from './types'
import { addDays, dayLabel } from '../prep/week'

export type MealLogInsert = Omit<MealLog, 'id' | 'created_at'>

export function dayTitle(date: string, today: string): string {
  if (date === today) return 'Today'
  if (addDays(today, -1) === date) return 'Yesterday'
  return dayLabel(date)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function validDayParam(param: string | null, today: string): string | null {
  if (param == null) return null
  if (!DATE_RE.test(param)) return null
  if (addDays(param, 0) !== param) return null
  if (param > today) return null
  return param
}

export function copyRows(logs: MealLog[], toDate: string): MealLogInsert[] {
  return logs.map((log) => ({
    user_id: log.user_id,
    meal_type: log.meal_type,
    food_id: log.food_id,
    name: log.name,
    quantity_g: log.quantity_g,
    kcal: log.kcal,
    protein_g: log.protein_g,
    carbs_g: log.carbs_g,
    fat_g: log.fat_g,
    logged_on: toDate,
  }))
}
