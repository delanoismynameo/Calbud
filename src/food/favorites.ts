import type { FoodResult } from './types'
import { foodRow } from './rows'
import { supabase } from '../lib/supabase'

export function foodKey(food: FoodResult): string {
  return `${food.source}:${food.sourceId}`
}

export function favoriteRow(food: FoodResult, householdId: string, on: boolean) {
  return { ...foodRow(food, householdId), is_favorite: on }
}

export function withoutFavorites(recents: FoodResult[], favorites: FoodResult[]): FoodResult[] {
  const favKeys = new Set(favorites.map(foodKey))
  return recents.filter((food) => !favKeys.has(foodKey(food)))
}

export async function setFavorite(food: FoodResult, householdId: string, on: boolean): Promise<void> {
  const row = favoriteRow(food, householdId, on)
  const { error } = await supabase
    .from('foods')
    .upsert(row, { onConflict: 'household_id,source,source_id' })

  if (error) throw new Error(error.message)
}
