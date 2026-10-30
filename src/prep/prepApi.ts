import { supabase } from '../lib/supabase'
import type { MealPrep, PrepFields } from './types'
import { addDays } from './week'
import type { FoodResult } from '../food/types'
import { foodRow } from '../food/rows'

export async function insertPreps(householdId: string, userId: string, rows: (PrepFields & { food_id: string | null })[]): Promise<void> {
  if (rows.length === 0) return
  const data = rows.map(r => ({ ...r, household_id: householdId, created_by: userId, status: 'planned' as const }))
  const { error } = await supabase.from('meal_prep').insert(data).select('id')

  if (error) throw new Error(error.message)
}

export async function fetchPrepWeek(householdId: string, start: string): Promise<MealPrep[]> {
  const end = addDays(start, 6)
  const { data, error } = await supabase
    .from('meal_prep')
    .select('*, foods(*)')
    .eq('household_id', householdId)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date')
    .order('start_time', { ascending: true, nullsFirst: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function insertPrep(householdId: string, userId: string, fields: PrepFields, foodId: string | null): Promise<void> {
  const { error } = await supabase
    .from('meal_prep')
    .insert({ ...fields, household_id: householdId, created_by: userId, status: 'planned', food_id: foodId })
    .select('id')

  if (error) throw new Error(error.message)
}

export async function updatePrep(
  id: string,
  changes: Partial<PrepFields> & { status?: 'planned' | 'done'; food_id?: string | null },
): Promise<void> {
  const { data, error } = await supabase
    .from('meal_prep')
    .update(changes)
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('That prep session could not be changed.')
}

export async function deletePrep(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('meal_prep')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('That prep session could not be deleted.')
}

export async function saveDishFood(food: FoodResult, householdId: string): Promise<string> {
  const { data, error } = await supabase
    .from('foods')
    .upsert(foodRow(food, householdId), { onConflict: 'household_id,source,source_id' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Upsert returned no id')
  return data.id
}

export async function fetchAllPreps(householdId: string): Promise<MealPrep[]> {
  const { data, error } = await supabase
    .from('meal_prep')
    .select('*, foods(*)')
    .eq('household_id', householdId)
    .order('scheduled_date', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  return data ?? []
}
