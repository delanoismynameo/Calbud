import type { FoodResult } from './types'
import { cleanExtras } from './extras'

export type FoodRowFromDb = {
  id: string
  household_id: string
  source: 'usda' | 'off' | 'custom'
  source_id: string | null
  name: string
  brand: string | null
  serving_g: number | null
  serving_label: string | null
  kcal_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g: number | null
  sugar_100g: number | null
  sodium_mg_100g: number | null
  extra_100g?: unknown
  is_favorite: boolean
}

export type RecentLogRow = { food_id: string | null; foods: FoodRowFromDb | null }

export function foodResultFromRow(row: FoodRowFromDb): FoodResult {
  return {
    source: row.source,
    sourceId: row.source_id ?? '',
    barcode: row.source === 'off' ? row.source_id : null,
    name: row.name,
    brand: row.brand,
    servingG: row.serving_g != null ? Number(row.serving_g) : null,
    servingLabel: row.serving_label,
    kcal100g: Number(row.kcal_100g),
    protein100g: Number(row.protein_100g),
    carbs100g: Number(row.carbs_100g),
    fat100g: Number(row.fat_100g),
    fiber100g: row.fiber_100g != null ? Number(row.fiber_100g) : null,
    sugar100g: row.sugar_100g != null ? Number(row.sugar_100g) : null,
    sodiumMg100g: row.sodium_mg_100g != null ? Number(row.sodium_mg_100g) : null,
    extras100g: cleanExtras(row.extra_100g),
  }
}

export function recentFoods(rows: RecentLogRow[], limit = 10): FoodResult[] {
  const seen = new Set<string>()
  const result: FoodResult[] = []

  for (const row of rows) {
    if (row.foods === null) continue
    const key = row.foods.id
    if (seen.has(key)) continue
    seen.add(key)
    result.push(foodResultFromRow(row.foods))
    if (result.length >= limit) break
  }

  return result
}
