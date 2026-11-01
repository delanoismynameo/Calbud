import { supabase } from '../lib/supabase'
import type { FoodResult } from './types'
import type { FoodRowFromDb } from './recents'
import { foodResultFromRow } from './recents'

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