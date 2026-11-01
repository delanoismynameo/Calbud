import type { FoodResult } from './types'
import type { ExtraKey } from './extras'
import { EXTRAS } from './extras'

export type EditKey = 'kcal' | 'fat' | 'carbs' | 'protein' | ExtraKey

export function editUnit(key: EditKey): string {
  if (key === 'kcal') return 'kcal'
  if (key === 'fat' || key === 'carbs' || key === 'protein') return 'g'
  const info = EXTRAS.find((e) => e.key === key)
  return info!.unit
}

export function applyLabelEdit(
  food: FoodResult,
  key: EditKey,
  value: number,
  grams: number
): FoodResult {
  // Return unchanged if grams is not a finite number above 0
  if (!Number.isFinite(grams) || grams <= 0) {
    return food
  }
  // Return unchanged if value is not a finite number of 0 or more
  if (!Number.isFinite(value) || value < 0) {
    return food
  }

  // Convert to per 100 g: round(value / grams * 100 * 100) / 100
  const per100 = Math.round(value / grams * 100 * 100) / 100

  // Return a NEW object, never change food
  if (key === 'kcal') {
    return { ...food, kcal100g: per100 }
  }
  if (key === 'fat') {
    return { ...food, fat100g: per100 }
  }
  if (key === 'carbs') {
    return { ...food, carbs100g: per100 }
  }
  if (key === 'protein') {
    return { ...food, protein100g: per100 }
  }

  // For extra keys
  // fiber_g, sugar_g, sodium_mg also set older fields
  if (key === 'fiber_g') {
    return {
      ...food,
      fiber100g: per100,
      extras100g: { ...(food.extras100g ?? {}), [key]: per100 },
    }
  }
  if (key === 'sugar_g') {
    return {
      ...food,
      sugar100g: per100,
      extras100g: { ...(food.extras100g ?? {}), [key]: per100 },
    }
  }
  if (key === 'sodium_mg') {
    return {
      ...food,
      sodiumMg100g: per100,
      extras100g: { ...(food.extras100g ?? {}), [key]: per100 },
    }
  }
  return {
    ...food,
    extras100g: { ...(food.extras100g ?? {}), [key]: per100 },
  }
}

export function applyServingEdit(food: FoodResult, label: string, grams: number): FoodResult {
  if (!Number.isFinite(grams) || grams <= 0) return food
  const trimmed = label.trim()
  return { ...food, servingG: grams, servingLabel: trimmed === '' ? null : trimmed }
}
