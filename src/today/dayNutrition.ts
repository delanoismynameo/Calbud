import type { MealLog } from './types'
import type { LabelRow } from '../food/label'
import { sumLogs } from './totals'
import type { ExtraKey, Extras } from '../food/extras'
import { cleanExtras, sumExtras } from '../food/extras'
import { labelRows } from '../food/label'

/** The day's totals as a Nutrition Facts label. */
export function dayNutrition(logs: MealLog[]): { kcal: number; rows: LabelRow[] } {
  const macros = sumLogs(logs)
  const summedExtras = sumExtras(logs.map((l) => cleanExtras(l.extra)))

  // Build extras (only keys that appear in at least one log)
  const extras: Extras = {}
  const missing: Partial<Record<ExtraKey, number>> = {}
  for (const e of summedExtras) {
    if (e.missing === logs.length) continue
    extras[e.info.key] = e.total
    if (e.missing > 0) {
      missing[e.info.key] = e.missing
    }
  }

  return {
    kcal: macros.kcal,
    rows: labelRows({ fat_g: macros.fat_g, carbs_g: macros.carbs_g, protein_g: macros.protein_g, extras, missing }),
  }
}

/** '1 food' or `${n} foods`. */
export function foodCount(n: number): string {
  return n === 1 ? '1 food' : `${n} foods`
}
