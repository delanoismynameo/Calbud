import type { FoodResult } from './types'

export interface CustomFoodInput {
  name: string; servingLabel: string; servingG: string
  kcal: string; protein: string; carbs: string; fat: string   // all per serving, as typed
}
export type CustomFoodField = keyof CustomFoodInput
export type CustomFoodResult =
  | { ok: true; food: FoodResult }
  | { ok: false; errors: Partial<Record<CustomFoodField, string>> }

function readNum(text: string): { value: number; blank: boolean; invalid: boolean } {
  const trimmed = text.trim()
  if (trimmed === '') return { value: NaN, blank: true, invalid: false }
  const withDot = trimmed.replace(',', '.')
  const num = Number(withDot)
  if (!Number.isFinite(num)) return { value: NaN, blank: false, invalid: true }
  return { value: num, blank: false, invalid: false }
}

function r(x: number): number {
  return Math.round(x * 100) / 100
}

export function parseCustomFood(input: CustomFoodInput, id: string): CustomFoodResult {
  const errors: Partial<Record<CustomFoodField, string>> = {}

  // name
  const nameTrimmed = input.name.trim()
  if (nameTrimmed === '') {
    errors.name = 'Enter a name.'
  } else if (nameTrimmed.length > 80) {
    errors.name = 'Keep the name under 80 characters.'
  }

  // servingLabel
  const labelTrimmed = input.servingLabel.trim()
  const label = labelTrimmed === '' ? '1 serving' : labelTrimmed
  if (label.length > 40) {
    errors.servingLabel = 'Keep this under 40 characters.'
  }

  // servingG
  const servingG = readNum(input.servingG)
  if (servingG.blank || servingG.invalid || servingG.value <= 0 || servingG.value > 2000) {
    errors.servingG = 'Enter the serving weight in grams (1–2000).'
  }

  // kcal
  const kcal = readNum(input.kcal)
  if (kcal.blank || kcal.invalid || kcal.value < 0 || kcal.value > 5000) {
    errors.kcal = 'Enter calories (0–5000).'
  }

  // protein, carbs, fat
  const fields: ('protein' | 'carbs' | 'fat')[] = ['protein', 'carbs', 'fat']
  const numMap: Partial<Record<CustomFoodField, number>> = {}
  for (const f of fields) {
    const n = readNum(input[f])
    if (f in input && input[f] === '') {
      // blank becomes 0, no error
      numMap[f] = 0
    } else if (n.blank || n.invalid || n.value < 0 || n.value > 1000) {
      errors[f] = 'Enter grams (0–1000).'
    } else {
      numMap[f] = n.value
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const servingGNum = servingG.value!
  const kcalNum = kcal.value!

  return {
    ok: true,
    food: {
      source: 'custom',
      sourceId: id,
      name: nameTrimmed,
      brand: null,
      servingG: servingGNum,
      servingLabel: label,
      kcal100g: r(kcalNum / servingGNum * 100),
      protein100g: r((numMap.protein ?? 0) / servingGNum * 100),
      carbs100g: r((numMap.carbs ?? 0) / servingGNum * 100),
      fat100g: r((numMap.fat ?? 0) / servingGNum * 100),
      fiber100g: null,
      sugar100g: null,
      sodiumMg100g: null,
      barcode: null,
    },
  }
}
