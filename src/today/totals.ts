import type { MealLog, MealType } from './types'
import { MEALS } from './types'

export function sumLogs(logs: MealLog[]): { kcal: number; protein_g: number; carbs_g: number; fat_g: number } {
  let kcal = 0
  let protein_g = 0
  let carbs_g = 0
  let fat_g = 0
  for (const log of logs) {
    kcal += log.kcal
    protein_g += log.protein_g
    carbs_g += log.carbs_g
    fat_g += log.fat_g
  }
  return {
    kcal: Math.round(kcal),
    protein_g: Math.round(protein_g * 10) / 10,
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
  }
}

export function groupByMeal(logs: MealLog[]): { meal: MealType; logs: MealLog[] }[] {
  return MEALS.map((meal) => ({ meal, logs: logs.filter((l) => l.meal_type === meal) }))
}

export function rescaleLog(log: MealLog, grams: number) {
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new RangeError('grams must be a finite number above 0')
  }
  const factor = grams / log.quantity_g
  return {
    quantity_g: grams,
    kcal: Math.round(log.kcal * factor),
    protein_g: Math.round(log.protein_g * factor * 10) / 10,
    carbs_g: Math.round(log.carbs_g * factor * 10) / 10,
    fat_g: Math.round(log.fat_g * factor * 10) / 10,
  }
}

export function progress(value: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, value / goal * 100)
}
