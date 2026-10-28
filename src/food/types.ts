export type FoodSource = 'usda' | 'off' | 'custom'

export interface FoodResult {
  source: FoodSource
  sourceId: string
  name: string
  brand: string | null
  servingG: number | null
  servingLabel: string | null
  kcal100g: number
  protein100g: number
  carbs100g: number
  fat100g: number
  fiber100g: number | null
  sugar100g: number | null
  sodiumMg100g: number | null
  barcode: string | null
}
