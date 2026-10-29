import type { Extras } from './extras'

export type FoodSource = 'usda' | 'off' | 'custom'

export interface FoodResult {
  source: FoodSource
  sourceId: string
  name: string
  brand: string | null
  servingG: number | null
  servingLabel: string | null
  kcal100g: number
  protein100g: number
  carbs100g: number
  fat100g: number
  fiber100g: number | null
  sugar100g: number | null
  sodiumMg100g: number | null
  barcode: string | null
  extras100g?: Extras
  recipe?: Recipe   // set on a food built from ingredients
}

// One ingredient of a built food: a snapshot of the food as picked (per-100 g values, without its own recipe),
// and how much of it went in. unit 'serving' is only offered when food.servingG is set.
export interface Ingredient {
  food: FoodResult
  amount: number
  unit: 'g' | 'serving'
}

// How a built food is divided: into a number of servings, or by the cooked total weight (then it is logged in grams).
export type RecipeYield = { kind: 'servings'; servings: number } | { kind: 'weight'; totalG: number }

export interface Recipe {
  ingredients: Ingredient[]
  yield: RecipeYield
}
