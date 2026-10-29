import { supabase } from '../lib/supabase'
import type { KcalRow } from './stats'

// The household's meal_logs rows (only user_id, logged_on, kcal) with logged_on from `from` to `to`, both included.
export async function fetchHouseholdKcal(from: string, to: string): Promise<KcalRow[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('user_id, logged_on, kcal')
    .gte('logged_on', from)
    .lte('logged_on', to)

  if (error) throw new Error(error.message)
  return data ?? []
}
