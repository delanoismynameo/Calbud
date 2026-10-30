import { supabase } from '../lib/supabase'
import type { GroceryItem } from './grocery'
import { groceryKey as makeKey } from './grocery'

export async function fetchGroceryExtras(householdId: string, weekStart: string): Promise<GroceryItem[]> {
  const { data, error } = await supabase
    .from('grocery_extras')
    .select('name, qty, unit')
    .eq('household_id', householdId)
    .eq('week_start', weekStart)
    .order('created_at')

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => ({
    name: row.name,
    qty: typeof row.qty === 'string' ? Number(row.qty) : row.qty,
    unit: row.unit,
  }))
}

export async function upsertGroceryExtras(householdId: string, weekStart: string, items: GroceryItem[]): Promise<void> {
  if (items.length === 0) return
  const rows = items.map(i => ({
    household_id: householdId,
    week_start: weekStart,
    key: makeKey(i),
    name: i.name,
    qty: i.qty,
    unit: i.unit,
  }))
  const { error } = await supabase.from('grocery_extras').upsert(rows, { onConflict: 'household_id,week_start,key' })
  if (error) throw new Error(error.message)
}

export async function deleteGroceryExtra(householdId: string, weekStart: string, key: string): Promise<void> {
  const { error } = await supabase
    .from('grocery_extras')
    .delete()
    .eq('household_id', householdId)
    .eq('week_start', weekStart)
    .eq('key', key)
  if (error) throw new Error(error.message)
}

export async function fetchGroceryTicks(householdId: string, weekStart: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('grocery_ticks')
    .select('key')
    .eq('household_id', householdId)
    .eq('week_start', weekStart)

  if (error) throw new Error(error.message)
  return data?.map(row => row.key) ?? []
}

export async function addGroceryTicks(householdId: string, weekStart: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const rows = keys.map(key => ({ household_id: householdId, week_start: weekStart, key }))
  const { error } = await supabase.from('grocery_ticks').upsert(rows, { onConflict: 'household_id,week_start,key', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

export async function removeGroceryTick(householdId: string, weekStart: string, key: string): Promise<void> {
  const { error } = await supabase
    .from('grocery_ticks')
    .delete()
    .eq('household_id', householdId)
    .eq('week_start', weekStart)
    .eq('key', key)
  if (error) throw new Error(error.message)
}

export async function clearGroceryTicks(householdId: string, weekStart: string): Promise<void> {
  const { error } = await supabase
    .from('grocery_ticks')
    .delete()
    .eq('household_id', householdId)
    .eq('week_start', weekStart)
  if (error) throw new Error(error.message)
}
