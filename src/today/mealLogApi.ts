import { supabase } from '../lib/supabase'
import type { MealLog } from './types'
import type { MealLogInsert } from './day'

type LogWithFood = MealLog & { foods?: { image_url?: string | null; photo_url?: string | null } | null }

// The photos come from the food the log points at: photo_url (the household's own photo, a storage path)
// and image_url (the package photo). If a photo migration isn't applied yet, the list still loads with fewer photos.
export async function fetchMealLogs(userId: string, date: string): Promise<MealLog[]> {
  const withPhotos = await supabase.from('meal_logs').select('*, foods(image_url, photo_url)')
    .eq('user_id', userId).eq('logged_on', date).order('created_at', { ascending: true })
  if (!withPhotos.error) return flatten(withPhotos.data ?? [])

  const withImage = await supabase.from('meal_logs').select('*, foods(image_url)')
    .eq('user_id', userId).eq('logged_on', date).order('created_at', { ascending: true })
  if (!withImage.error) return flatten(withImage.data ?? [])

  const plain = await supabase.from('meal_logs').select('*')
    .eq('user_id', userId).eq('logged_on', date).order('created_at', { ascending: true })
  if (plain.error) throw new Error(plain.error.message)
  return plain.data ?? []
}

function flatten(rows: LogWithFood[]): MealLog[] {
  return rows.map(({ foods, ...log }) => ({ ...log, image_url: foods?.image_url ?? null, photo_url: foods?.photo_url ?? null }))
}

export async function updateMealLog(
  id: string,
  changes: Partial<Pick<MealLog, 'meal_type' | 'quantity_g' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'extra'>>,
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

export async function insertMealLogs(rows: MealLogInsert[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from('meal_logs').insert(rows)
  if (error) throw new Error(error.message)
}
