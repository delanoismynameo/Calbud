import { supabase } from '../lib/supabase'
import type { MenuSlot, MenuMeal } from './types'
import type { SlotRow } from './menu'
import { addDays } from '../prep/week'

export async function fetchMenuWeek(householdId: string, start: string): Promise<MenuSlot[]> {
  const end = addDays(start, 6)
  const { data, error } = await supabase
    .from('menu_slots')
    .select('*, meal_prep(title, foods(*))')
    .eq('household_id', householdId)
    .gte('slot_date', start)
    .lte('slot_date', end)
    .order('slot_date')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveSlot(householdId: string, date: string, meal: MenuMeal, label: string, prepId: string | null): Promise<void> {
  const { error } = await supabase
    .from('menu_slots')
    .upsert({ household_id: householdId, slot_date: date, meal, label, prep_id: prepId }, { onConflict: 'household_id,slot_date,meal' })
    .select('id')

  if (error) throw new Error(error.message)
}

export async function saveSlots(householdId: string, rows: SlotRow[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase.from('menu_slots').upsert(rows.map(r => ({ ...r, household_id: householdId })), { onConflict: 'household_id,slot_date,meal' }).select('id')

  if (error) throw new Error(error.message)
}

export async function clearSlot(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('menu_slots')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('That slot could not be cleared.')
}
