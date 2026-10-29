import type { FoodResult, Ingredient, RecipeYield } from './types'
import { ingredientGrams } from './recipe'

// Reading a typed number: trim, replace one ',' with '.', Number(). Usable when finite and > 0; otherwise null.
export function readAmount(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const replaced = trimmed.replace(',', '.')
  const n = Number(replaced)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

// The starting amount text and unit for a newly picked food: '1' and 'serving' when food.servingG is set, otherwise '100' and 'g'.
export function startAmount(food: FoodResult): { text: string; unit: 'g' | 'serving' } {
  if (food.servingG != null) {
    return { text: '1', unit: 'serving' }
  }
  return { text: '100', unit: 'g' }
}

// One line of the list: `${amount} × ${servingLabel ?? 'serving'}` for unit 'serving' (e.g. '0.5 × 1 cup'), `${amount} g` for 'g';
// then ' · ' and the ingredient's kcal: Math.round(food.kcal100g * ingredientGrams(ing) / 100) + ' cal'.
export function ingredientLine(ing: Ingredient): string {
  const calories = Math.round(ing.food.kcal100g * ingredientGrams(ing) / 100)
  if (ing.unit === 'serving') {
    return `${ing.amount} × ${ing.food.servingLabel ?? 'serving'} · ${calories} cal`
  }
  return `${ing.amount} g · ${calories} cal`
}

// The yield from the form: mode 'servings' gives { kind: 'servings', servings: Number(text) };
// mode 'weight' gives { kind: 'weight', totalG: readAmount(text) ?? NaN }. (Invalid values are caught later by recipeError.)
export function yieldFrom(mode: 'servings' | 'weight', text: string): RecipeYield {
  if (mode === 'servings') {
    return { kind: 'servings', servings: Number(text) }
  }
  return { kind: 'weight', totalG: readAmount(text) ?? NaN }
}
