import { supabase } from '../lib/supabase'
import type { FoodResult } from './types'
import { foodRow, mealLogRow } from './rows'

export async function logFood({
  food, grams, mealType, loggedOn, userId, householdId,
}: {
  food: FoodResult
  grams: number
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  loggedOn: string
  userId: string
  householdId: string
}): Promise<void> {
  // Step 1: upsert the food and get its id
  const { data, error: upsertError } = await supabase
    .from('foods')
    .upsert(foodRow(food, householdId), { onConflict: 'household_id,source,source_id' })
    .select('id')
    .single()

  if (upsertError) throw new Error(upsertError.message)
  if (!data?.id) throw new Error('Upsert returned no id')

  // Step 2: insert the meal log
  const { error: logError } = await supabase.from('meal_logs').insert(mealLogRow({
    food,
    foodId: data.id,
    grams,
    mealType,
    loggedOn,
    userId,
  }))

  if (logError) throw new Error(logError.message)
}
