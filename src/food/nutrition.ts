import type { FoodResult } from './types'

export function scaleNutrition(food: FoodResult, grams: number): { kcal: number; protein_g: number; carbs_g: number; fat_g: number } {
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new RangeError('grams must be a positive number')
  }

  const kcal = Math.round(food.kcal100g * grams / 100)
  const protein_g = Math.round(food.protein100g * grams / 100 * 10) / 10
  const carbs_g = Math.round(food.carbs100g * grams / 100 * 10) / 10
  const fat_g = Math.round(food.fat100g * grams / 100 * 10) / 10

  return { kcal, protein_g, carbs_g, fat_g }
}
