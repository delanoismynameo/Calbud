import { supabase } from '../lib/supabase'
import type { FoodResult } from './types'
import type { FoodRowFromDb } from './recents'
import { foodResultFromRow } from './recents'
import { foodRow } from './rows'
import { lookupBarcode } from './off'
import { lookupUsdaBarcode } from './usda'
import { usdaApiKey } from './search'
import { sourceMismatch } from './crossCheck'

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

// Deletes a saved barcode food and looks up the original from Open Food Facts or USDA.
// Returns the original food, or null if no match found.
export async function deleteSavedBarcodeFoodAndLookupOriginal(
  householdId: string,
  barcode: string,
): Promise<FoodResult | null> {
  // Delete the saved food
  const { error: deleteError } = await supabase
    .from('foods')
    .delete()
    .eq('household_id', householdId)
    .eq('barcode', barcode)

  if (deleteError) throw new Error(deleteError.message)

  // Look up the original in Open Food Facts and USDA (same pattern as FoodFinder)
  const [off, usda] = await Promise.allSettled([
    lookupBarcode(barcode),
    lookupUsdaBarcode(barcode, { apiKey: usdaApiKey() }),
  ])

  const offFood = off.status === 'fulfilled' ? off.value : null
  const usdaFood = usda.status === 'fulfilled' ? usda.value : null

  if (offFood && usdaFood) {
    const warning = sourceMismatch(offFood, usdaFood)
    return warning ? { ...offFood, crossCheck: warning } : offFood
  }
  return offFood ?? usdaFood ?? null
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
