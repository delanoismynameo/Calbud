import type { FoodResult, Ingredient, Recipe, RecipeYield } from './types'
import type { ExtraKey, Extras } from './extras'
import { EXTRAS, scaleExtras, cleanExtras } from './extras'

function round(value: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

// unit 'g': amount. unit 'serving': amount * food.servingG, or amount when servingG is null.
export function ingredientGrams(ing: Ingredient): number {
  return ing.unit === 'serving' && ing.food.servingG != null ? ing.amount * ing.food.servingG : ing.amount
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
  let grams = 0, kcal = 0, protein = 0, carbs = 0, fat = 0
  const sums: Extras = {}
  const have: Partial<Record<ExtraKey, number>> = {}
  for (const ing of ingredients) {
    const g = ingredientGrams(ing)
    grams += g
    kcal += ing.food.kcal100g * g / 100
    protein += ing.food.protein100g * g / 100
    carbs += ing.food.carbs100g * g / 100
    fat += ing.food.fat100g * g / 100
    const scaled = scaleExtras(ing.food.extras100g ?? {}, g)
    for (const key of Object.keys(scaled) as ExtraKey[]) {
      sums[key] = (sums[key] ?? 0) + scaled[key]!
      have[key] = (have[key] ?? 0) + 1
    }
  }
  const extras: Extras = {}
  const missing: Partial<Record<ExtraKey, number>> = {}
  for (const { key } of EXTRAS) {
    if (sums[key] === undefined) continue
    extras[key] = round(sums[key], 1)
    const lacking = ingredients.length - have[key]!
    if (lacking > 0) missing[key] = lacking
  }
  return { grams: round(grams, 1), kcal: Math.round(kcal), protein_g: round(protein, 1), carbs_g: round(carbs, 1), fat_g: round(fat, 1), extras, missing }
}

const inRange = (v: number) => Number.isFinite(v) && v > 0 && v <= 20000

// The first problem, or null when the recipe can be saved.
export function recipeError(recipe: Recipe): string | null {
  if (recipe.ingredients.length === 0) return 'Add at least one ingredient.'
  if (!recipe.ingredients.every((ing) => inRange(ingredientGrams(ing)))) return 'Check the ingredient amounts.'
  const y = recipe.yield
  if (y.kind === 'servings') {
    if (!Number.isInteger(y.servings) || y.servings < 1 || y.servings > 100) return 'Servings must be a whole number from 1 to 100.'
  } else if (!inRange(y.totalG)) {
    return 'Enter the cooked weight in grams (1–20000).'
  }
  return null
}

// The saved food, for a recipe that has no error.
export function recipeFood(recipe: Recipe, name: string, id: string): FoodResult {
  const t = recipeTotals(recipe.ingredients)
  const base = recipe.yield.kind === 'servings' ? t.grams : recipe.yield.totalG
  const per100 = (v: number) => round(v / base * 100, 2)
  const extras100g: Extras = {}
  for (const key of Object.keys(t.extras) as ExtraKey[]) extras100g[key] = per100(t.extras[key]!)
  const servings = recipe.yield.kind === 'servings' ? recipe.yield.servings : null
  return {
    source: 'custom',
    sourceId: id,
    name: name.trim(),
    brand: null,
    servingG: servings ? round(t.grams / servings, 2) : null,
    servingLabel: servings ? '1 serving' : null,
    kcal100g: per100(t.kcal),
    protein100g: per100(t.protein_g),
    carbs100g: per100(t.carbs_g),
    fat100g: per100(t.fat_g),
    fiber100g: extras100g.fiber_g ?? null,
    sugar100g: extras100g.sugar_g ?? null,
    sodiumMg100g: extras100g.sodium_mg ?? null,
    barcode: null,
    extras100g,
    recipe: {
      yield: recipe.yield,
      // Snapshots don't nest: an ingredient that is itself a built food keeps only its numbers.
      ingredients: recipe.ingredients.map(({ food: { recipe: _nested, ...food }, amount, unit }) => ({ food, amount, unit })),
    },
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function cleanYield(raw: unknown): RecipeYield | null {
  if (!isObj(raw)) return null
  if (raw.kind === 'servings' && isNum(raw.servings)) return { kind: 'servings', servings: raw.servings }
  if (raw.kind === 'weight' && isNum(raw.totalG)) return { kind: 'weight', totalG: raw.totalG }
  return null
}

function cleanIngredient(raw: unknown): Ingredient | null {
  if (!isObj(raw) || !isObj(raw.food)) return null
  const food = raw.food
  if (typeof food.name !== 'string' || ![food.kcal100g, food.protein100g, food.carbs100g, food.fat100g].every(isNum)) return null
  if (!isNum(raw.amount) || raw.amount <= 0 || (raw.unit !== 'g' && raw.unit !== 'serving')) return null
  return { food: { ...(food as unknown as FoodResult), extras100g: cleanExtras(food.extras100g) }, amount: raw.amount, unit: raw.unit }
}

// Reads a stored recipe (from the database's jsonb), or null when it isn't one.
export function cleanRecipe(raw: unknown): Recipe | null {
  if (!isObj(raw) || !Array.isArray(raw.ingredients)) return null
  const y = cleanYield(raw.yield)
  const ingredients = raw.ingredients.map(cleanIngredient)
  if (!y || ingredients.some((i) => i === null)) return null
  return { ingredients: ingredients as Ingredient[], yield: y }
}
