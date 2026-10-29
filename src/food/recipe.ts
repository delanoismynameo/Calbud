import type { FoodResult, Ingredient, Recipe } from './types'
import type { ExtraKey, Extras } from './extras'
import { EXTRAS, scaleExtras, cleanExtras } from './extras'

function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

export function ingredientGrams(ing: Ingredient): number {
  if (ing.unit === 'g') return ing.amount
  if (ing.food.servingG == null) return ing.amount
  return ing.amount * ing.food.servingG
}

export interface RecipeTotals {
  grams: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  extras: Extras
  missing: Partial<Record<ExtraKey, number>>
}

export function recipeTotals(ingredients: Ingredient[]): RecipeTotals {
  let gramSum = 0
  let kcalRaw = 0
  let proteinRaw = 0
  let carbsRaw = 0
  let fatRaw = 0
  const extrasSums: Partial<Record<ExtraKey, number>> = {}
  const missingCount: Partial<Record<ExtraKey, number>> = {}

  for (const ing of ingredients) {
    const g = ingredientGrams(ing)
    gramSum += g
    kcalRaw += ing.food.kcal100g * g / 100
    proteinRaw += ing.food.protein100g * g / 100
    carbsRaw += ing.food.carbs100g * g / 100
    fatRaw += ing.food.fat100g * g / 100

    for (const info of EXTRAS) {
      const key = info.key
      if (key in ing.food.extras100g && ing.food.extras100g![key] !== undefined) {
        const scaled = scaleExtras(ing.food.extras100g!, g)[key]!
        extrasSums[key] = (extrasSums[key] ?? 0) + scaled
      } else {
        missingCount[key] = (missingCount[key] ?? 0) + 1
      }
    }
  }

  const extras: Extras = {}
  const missing: Partial<Record<ExtraKey, number>> = {}
  for (const info of EXTRAS) {
    const key = info.key
    if (key in extrasSums && extrasSums[key] !== undefined) {
      extras[key] = round(extrasSums[key], 1)
      const mc = missingCount[key]
      if (mc != null && mc > 0) {
        missing[key] = mc
      }
    }
  }

  return {
    grams: round(gramSum, 1),
    kcal: Math.round(kcalRaw),
    protein_g: round(proteinRaw, 1),
    carbs_g: round(carbsRaw, 1),
    fat_g: round(fatRaw, 1),
    extras,
    missing,
  }
}

export function recipeError(recipe: Recipe): string | null {
  if (recipe.ingredients.length === 0) return 'Add at least one ingredient.'

  for (const ing of recipe.ingredients) {
    const g = ing.amount
    if (!isFinite(g) || g <= 0 || g > 20000) {
      return 'Check the ingredient amounts.'
    }
  }

  if (recipe.yield.kind === 'servings') {
    const s = recipe.yield.servings
    if (!isFinite(s) || !Number.isInteger(s) || s < 1 || s > 100) {
      return 'Servings must be a whole number from 1 to 100.'
    }
  } else {
    const t = recipe.yield.totalG
    if (!isFinite(t) || t <= 0 || t > 20000) {
      return 'Enter the cooked weight in grams (1–20000).'
    }
  }

  return null
}

export function recipeFood(recipe: Recipe, name: string, id: string): FoodResult {
  const totals = recipeTotals(recipe.ingredients)
  const base = recipe.yield.kind === 'servings' ? totals.grams : recipe.yield.totalG

  const result: FoodResult = {
    source: 'custom',
    sourceId: id,
    name: name.trim(),
    brand: null,
    servingG: null,
    servingLabel: null,
    kcal100g: round(totals.kcal / base * 100, 2),
    protein100g: round(totals.protein_g / base * 100, 2),
    carbs100g: round(totals.carbs_g / base * 100, 2),
    fat100g: round(totals.fat_g / base * 100, 2),
    fiber100g: null,
    sugar100g: null,
    sodiumMg100g: null,
    barcode: null,
    extras100g: totals.extras,
    recipe: undefined as any,
  }

  if (recipe.yield.kind === 'servings') {
    result.servingG = round(totals.grams / recipe.yield.servings, 2)
    result.servingLabel = '1 serving'
  }

  result.fiber100g = totals.extras['fiber_g'] ?? null
  result.sugar100g = totals.extras['sugar_g'] ?? null
  result.sodiumMg100g = totals.extras['sodium_mg'] ?? null

  result.recipe = {
    yield: recipe.yield,
    ingredients: recipe.ingredients.map(ing => ({
      food: (() => {
        const f = ing.food
        // Remove the recipe field from the cloned food object
        const clone = { ...f }
        delete (clone as Record<string, unknown>).recipe
        return clone as FoodResult
      })(),
      amount: ing.amount,
      unit: ing.unit,
    })),
  }

  return result
}

function isValidIngredientFood(food: unknown): food is FoodResult {
  if (typeof food !== 'object' || food === null) return false
  const f = food as Record<string, unknown>
  if (typeof f.name !== 'string') return false
  const keys = ['kcal100g', 'protein100g', 'carbs100g', 'fat100g'] as const
  for (const k of keys) {
    const v = f[k]
    if (typeof v !== 'number' || !isFinite(v)) return false
  }
  return true
}

export function cleanRecipe(raw: unknown): Recipe | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  if (!('ingredients' in obj) && !('yield' in obj)) return null

  // Must have both keys present as objects/arrays
  const ingredientsRaw = obj.ingredients
  const yieldRaw = obj.yield

  // Validate yield
  let yieldParsed: RecipeYield | null = null
  if (typeof yieldRaw === 'object' && yieldRaw !== null) {
    const y = yieldRaw as Record<string, unknown>
    const kind = y.kind
    if (kind === 'servings') {
      const s = y.servings
      if (typeof s === 'number' && isFinite(s)) {
        yieldParsed = { kind: 'servings', servings: s }
      }
    } else if (kind === 'weight') {
      const t = y.totalG
      if (typeof t === 'number' && isFinite(t)) {
        yieldParsed = { kind: 'weight', totalG: t }
      }
    }
  }
  if (!yieldParsed) return null

  // Validate ingredients
  if (!Array.isArray(ingredientsRaw)) return null
  const ingredients: Ingredient[] = []
  for (const item of ingredientsRaw) {
    if (typeof item !== 'object' || item === null) return false as any // will become null at end
    const i = item as Record<string, unknown>
    const foodRaw = i.food
    if (!isValidIngredientFood(foodRaw)) return null
    const amount = i.amount
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return null
    const unit = i.unit
    if (unit !== 'g' && unit !== 'serving') return null
    ingredients.push({ food: foodRaw, amount, unit })
  }

  return { yield: yieldParsed, ingredients }
}
