import { supabase } from '../lib/supabase'
import type { ActivityFields, Activity } from './types'
import { addDays } from '../prep/week'

export async function fetchActivityWeek(start: string): Promise<Activity[]> {
  const end = addDays(start, 6)
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date')
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function insertActivity(userId: string, fields: ActivityFields): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .insert({ ...fields, user_id: userId })
    .select('id')

  if (error) throw new Error(error.message)
}

export async function updateActivity(id: string, changes: Partial<ActivityFields> & { completed?: boolean }): Promise<void> {
  const { data, error } = await supabase
    .from('activities')
    .update(changes)
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('That activity could not be changed.')
}

export async function deleteActivity(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('That activity could not be deleted.')
}
