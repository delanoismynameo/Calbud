import type { ExtraKey, Extras } from './extras'
import { EXTRAS, dvPercent } from './extras'

export type LabelKey = 'fat' | 'carbs' | 'protein' | ExtraKey

export interface LabelRow {
  key: LabelKey
  label: string
  amount: string | null // formatted, e.g. '5 g'; null when there is no data
  dv: number | null // % Daily Value; null when the nutrient has no DV or there is no data
  indent: 0 | 1 | 2
  bold: boolean
  group: 'main' | 'vitamins'
  missing?: number // how many foods logged had no value for this nutrient
}

export interface LabelInput { fat_g: number; carbs_g: number; protein_g: number; extras: Extras; missing?: Partial<Record<ExtraKey, number>> }

// Under 10: rounded to one decimal, without a trailing '.0'. 10 or more: rounded to a whole number.
// Then a space and the unit. formatAmount(4.96, 'g') = '5 g', (0.46, 'g') = '0.5 g', (12.4, 'g') = '12 g', (0, 'mg') = '0 mg'.
export function formatAmount(value: number, unit: string): string {
  let formatted: string
  if (value < 10) {
    formatted = String(Math.round(value * 10) / 10)
  } else {
    formatted = String(Math.round(value))
  }
  return formatted + ' ' + unit
}

type Spec = { key: LabelKey; label: string; indent: 0 | 1 | 2; bold: boolean; group: 'main' | 'vitamins' }

// Label order, as on a US package.
const SPECS: Spec[] = [
  { key: 'fat', label: 'Total Fat', indent: 0, bold: true, group: 'main' },
  { key: 'sat_fat_g', label: 'Saturated Fat', indent: 1, bold: false, group: 'main' },
  { key: 'trans_fat_g', label: 'Trans Fat', indent: 1, bold: false, group: 'main' },
  { key: 'cholesterol_mg', label: 'Cholesterol', indent: 0, bold: true, group: 'main' },
  { key: 'sodium_mg', label: 'Sodium', indent: 0, bold: true, group: 'main' },
  { key: 'carbs', label: 'Total Carbohydrate', indent: 0, bold: true, group: 'main' },
  { key: 'fiber_g', label: 'Dietary Fiber', indent: 1, bold: false, group: 'main' },
  { key: 'sugar_g', label: 'Total Sugars', indent: 1, bold: false, group: 'main' },
  { key: 'added_sugar_g', label: 'Added Sugars', indent: 2, bold: false, group: 'main' },
  { key: 'protein', label: 'Protein', indent: 0, bold: true, group: 'main' },
  { key: 'vit_d_mcg', label: 'Vitamin D', indent: 0, bold: false, group: 'vitamins' },
  { key: 'calcium_mg', label: 'Calcium', indent: 0, bold: false, group: 'vitamins' },
  { key: 'iron_mg', label: 'Iron', indent: 0, bold: false, group: 'vitamins' },
  { key: 'potassium_mg', label: 'Potassium', indent: 0, bold: false, group: 'vitamins' },
]

// The rows in label order. DVs for the three macros: fat 78 g, carbs 275 g, protein none.
export function labelRows(input: LabelInput): LabelRow[] {
  const macros = {
    fat: { value: input.fat_g, dv: 78 },
    carbs: { value: input.carbs_g, dv: 275 },
    protein: { value: input.protein_g, dv: null },
  }
  return SPECS.map((spec) => {
    let value: number | undefined
    let unit: string
    let dv: number | null
    if (spec.key === 'fat' || spec.key === 'carbs' || spec.key === 'protein') {
      ;({ value, dv } = macros[spec.key])
      unit = 'g'
    } else {
      const info = EXTRAS.find((e) => e.key === spec.key)!
      value = input.extras[spec.key]
      unit = info.unit
      dv = info.dv
    }
    let missingCount: number | undefined
    const extraMissing = input.missing?.[spec.key]
    if (extraMissing != null && extraMissing > 0) {
      missingCount = extraMissing
    }
    if (value === undefined) return { ...spec, amount: null, dv: null, ...(missingCount != null ? { missing: missingCount } : {}) }
    return { ...spec, amount: formatAmount(value, unit), dv: dvPercent(value, dv), ...(missingCount != null ? { missing: missingCount } : {}) }
  })
}

// The "Serving size" line.
export function servingLine(
  unit: 'g' | 'serving',
  amount: string,
  grams: number,
  servingLabel: string | null
): string {
  if (unit === 'g') {
    return Math.round(grams) + ' g'
  }
  const roundedGrams = Math.round(grams)
  if (servingLabel != null) {
    return amount + ' × ' + servingLabel + ' (' + roundedGrams + ' g)'
  }
  if (amount === '1') {
    return '1 serving (' + roundedGrams + ' g)'
  }
  return amount + ' servings (' + roundedGrams + ' g)'
}
