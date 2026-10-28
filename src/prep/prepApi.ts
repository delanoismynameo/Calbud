import { supabase } from '../lib/supabase'
import type { MealPrep, PrepFields } from './types'
import { addDays } from './week'

export async function fetchPrepWeek(householdId: string, start: string): Promise<MealPrep[]> {
  const end = addDays(start, 6)
  const { data, error } = await supabase
    .from('meal_prep')
    .select('*')
    .eq('household_id', householdId)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date')
    .order('start_time', { ascending: true, nullsFirst: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function insertPrep(householdId: string, userId: string, fields: PrepFields): Promise<void> {
  const { error } = await supabase
    .from('meal_prep')
    .insert({ ...fields, household_id: householdId, created_by: userId, status: 'planned' })
    .select('id')

  if (error) throw new Error(error.message)
}

export async function updatePrep(
  id: string,
  changes: Partial<PrepFields> & { status?: 'planned' | 'done' },
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
