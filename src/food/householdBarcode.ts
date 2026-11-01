import { supabase } from '../lib/supabase'
import type { FoodResult } from './types'
import type { FoodRowFromDb } from './recents'
import { foodResultFromRow } from './recents'
import { foodRow } from './rows'

// The household's own saved version of a food, found by its barcode. Any failure (for example
// the barcode column not being there yet) counts as "no saved version", so scanning still works.
export async function findHouseholdFoodByBarcode(householdId: string, barcode: string): Promise<FoodResult | null> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('household_id', householdId)
    .eq('barcode', barcode)
    .maybeSingle()
  if (error || !data) return null
  return foodResultFromRow(data as FoodRowFromDb)
}

// Saves a corrected food as the household's own custom food for this barcode (replacing an earlier correction of the same barcode).
export async function saveBarcodeFood(food: FoodResult, householdId: string): Promise<FoodResult> {
  const code = food.barcode
  if (code == null) throw new Error('This food has no barcode.')
  const existing = await findHouseholdFoodByBarcode(householdId, code)
  const saved: FoodResult = { ...food, source: 'custom', sourceId: existing?.sourceId ?? crypto.randomUUID(), barcode: code }
  const { error } = await supabase.from('foods').upsert(foodRow(saved, householdId), { onConflict: 'household_id,source,source_id' })
  if (error) throw new Error(error.message)
  return saved
}
