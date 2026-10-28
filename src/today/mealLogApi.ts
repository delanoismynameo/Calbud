import { supabase } from '../lib/supabase'
import type { MealLog } from './types'

export async function fetchMealLogs(userId: string, date: string): Promise<MealLog[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_on', date)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updateMealLog(
  id: string,
  changes: Partial<Pick<MealLog, 'meal_type' | 'quantity_g' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>>,
): Promise<void> {
  const { data, error } = await supabase
    .from('meal_logs')
    .update(changes)
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('That entry could not be changed.')
}

export async function deleteMealLog(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('meal_logs')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('That entry could not be deleted.')
}
