import type { FoodRowFromDb } from '../food/recents'
import { parseCustomFood, type CustomFoodResult } from '../food/customFood'
import type { FoodResult } from '../food/types'

export interface DishInput {
  servingG: string
  kcal: string
  protein: string
  carbs: string
  fat: string
}

export const emptyDish: DishInput = { servingG: '', kcal: '', protein: '', carbs: '', fat: '' }

export function isDishBlank(d: DishInput): boolean {
  return [d.servingG, d.kcal, d.protein, d.carbs, d.fat].every((v) => v.trim() === '')
}

export function dishFromFood(row: FoodRowFromDb): DishInput {
  if (row.serving_g == null) return emptyDish
  const g = Number(row.serving_g)
  return {
    servingG: String(g),
    kcal: String(Math.round(Number(row.kcal_100g) * g / 100)),
    protein: String(Math.round(Number(row.protein_100g) * g / 100 * 10) / 10),
    carbs: String(Math.round(Number(row.carbs_100g) * g / 100 * 10) / 10),
    fat: String(Math.round(Number(row.fat_100g) * g / 100 * 10) / 10),
  }
}

export function kcalPerServing(row: FoodRowFromDb): number | null {
  if (row.serving_g == null) return null
  return Math.round(Number(row.kcal_100g) * Number(row.serving_g) / 100)
}

export function parseDish(title: string, d: DishInput, sourceId: string):
  | { ok: true; food: FoodResult }
  | { ok: false; errors: Partial<Record<keyof DishInput, string>> } {
  
  const result = parseCustomFood({ name: title, servingLabel: '1 serving', ...d }, sourceId) as CustomFoodResult
  
  if (result.ok) return { ok: true, food: result.food }
  
  // Strip any name error; the title is checked by the prep form.
  const { name: _, ...dishErrors } = result.errors
  
  // If there are no dish field errors left, still return with empty errors (test case).
  if (Object.keys(dishErrors).length === 0) {
    return { ok: false, errors: {} as Partial<Record<keyof DishInput, string>> }
  }
  
  return { ok: false, errors: dishErrors }
}
