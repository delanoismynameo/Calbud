import type { FoodResult, Recipe } from './types'
import { scaleNutrition } from './nutrition'
import type { Extras } from './extras'
import { scaleExtras } from './extras'

type FoodRow = {
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
  extra_100g: Extras
  recipe?: Recipe
}

export function foodRow(food: FoodResult, householdId: string): FoodRow {
  return {
    household_id: householdId,
    source: food.source,
    source_id: food.sourceId,
    name: food.name,
    brand: food.brand,
    serving_g: food.servingG,
    serving_label: food.servingLabel,
    kcal_100g: food.kcal100g,
    protein_100g: food.protein100g,
    carbs_100g: food.carbs100g,
    fat_100g: food.fat100g,
    fiber_100g: food.fiber100g,
    sugar_100g: food.sugar100g,
    sodium_mg_100g: food.sodiumMg100g,
    extra_100g: food.extras100g ?? {},
    // Only built foods send the column, so saving other foods doesn't depend on the recipe migration.
    ...(food.recipe ? { recipe: food.recipe } : {}),
  }
}

type MealLogRow = {
  user_id: string
  logged_on: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_id: string
  name: string
  quantity_g: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  extra: Extras
}

interface MealLogRowParams {
  food: FoodResult
  foodId: string
  grams: number
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  loggedOn: string
  userId: string
}

export function mealLogRow({ food, foodId, grams, mealType, loggedOn, userId }: MealLogRowParams): MealLogRow {
  const nutrition = scaleNutrition(food, grams)
  const name = food.brand ? `${food.name} (${food.brand})` : food.name
  return {
    user_id: userId,
    logged_on: loggedOn,
    meal_type: mealType,
    food_id: foodId,
    name,
    quantity_g: grams,
    kcal: nutrition.kcal,
    protein_g: nutrition.protein_g,
    carbs_g: nutrition.carbs_g,
    fat_g: nutrition.fat_g,
    extra: scaleExtras(food.extras100g ?? {}, grams),
  }
}
