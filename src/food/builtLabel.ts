import type { FoodResult } from './types'
import type { LabelRow } from './label'
import { scaleNutrition } from './nutrition'
import { labelRows } from './label'
import { scaleExtras } from './extras'

export function builtLabel(food: FoodResult): { servingText: string; kcal: number; rows: LabelRow[] } {
  const grams = food.servingG ?? 100
  const servingText = food.servingG != null
    ? `1 serving (${Math.round(grams)} g)`
    : '100 g'
  const n = scaleNutrition(food, grams)
  const rows = labelRows({
    fat_g: n.fat_g,
    carbs_g: n.carbs_g,
    protein_g: n.protein_g,
    extras: scaleExtras(food.extras100g ?? {}, grams),
  })
  return { servingText, kcal: n.kcal, rows }
}
