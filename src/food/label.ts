import type { ExtraKey, Extras } from './extras'
import { EXTRAS } from './extras'
import { dvPercent } from './extras'

export type LabelKey = 'fat' | 'carbs' | 'protein' | ExtraKey

export interface LabelRow {
  key: LabelKey
  label: string
  amount: string | null // formatted, e.g. '5 g'; null when there is no data
  dv: number | null // % Daily Value; null when the nutrient has no DV or there is no data
  indent: 0 | 1 | 2
  bold: boolean
  group: 'main' | 'vitamins'
}

export interface LabelInput { fat_g: number; carbs_g: number; protein_g: number; extras: Extras }

const EXTRA_LABELS: Record<ExtraKey, string> = {
  sat_fat_g: 'Saturated Fat',
  trans_fat_g: 'Trans Fat',
  cholesterol_mg: 'Cholesterol',
  sodium_mg: 'Sodium',
  fiber_g: 'Dietary Fiber',
  sugar_g: 'Total Sugars',
  added_sugar_g: 'Added Sugars',
  vit_d_mcg: 'Vitamin D',
  calcium_mg: 'Calcium',
  iron_mg: 'Iron',
  potassium_mg: 'Potassium',
}

const EXTRA_DVS: Record<ExtraKey, number | null> = {
  sat_fat_g: EXTRAS.find(e => e.key === 'sat_fat_g')!.dv,
  trans_fat_g: EXTRAS.find(e => e.key === 'trans_fat_g')!.dv,
  cholesterol_mg: EXTRAS.find(e => e.key === 'cholesterol_mg')!.dv,
  sodium_mg: EXTRAS.find(e => e.key === 'sodium_mg')!.dv,
  fiber_g: EXTRAS.find(e => e.key === 'fiber_g')!.dv,
  sugar_g: EXTRAS.find(e => e.key === 'sugar_g')!.dv,
  added_sugar_g: EXTRAS.find(e => e.key === 'added_sugar_g')!.dv,
  vit_d_mcg: EXTRAS.find(e => e.key === 'vit_d_mcg')!.dv,
  calcium_mg: EXTRAS.find(e => e.key === 'calcium_mg')!.dv,
  iron_mg: EXTRAS.find(e => e.key === 'iron_mg')!.dv,
  potassium_mg: EXTRAS.find(e => e.key === 'potassium_mg')!.dv,
}

const EXTRA_UNITS: Record<ExtraKey, string> = {
  sat_fat_g: EXTRAS.find(e => e.key === 'sat_fat_g')!.unit,
  trans_fat_g: EXTRAS.find(e => e.key === 'trans_fat_g')!.unit,
  cholesterol_mg: EXTRAS.find(e => e.key === 'cholesterol_mg')!.unit,
  sodium_mg: EXTRAS.find(e => e.key === 'sodium_mg')!.unit,
  fiber_g: EXTRAS.find(e => e.key === 'fiber_g')!.unit,
  sugar_g: EXTRAS.find(e => e.key === 'sugar_g')!.unit,
  added_sugar_g: EXTRAS.find(e => e.key === 'added_sugar_g')!.unit,
  vit_d_mcg: EXTRAS.find(e => e.key === 'vit_d_mcg')!.unit,
  calcium_mg: EXTRAS.find(e => e.key === 'calcium_mg')!.unit,
  iron_mg: EXTRAS.find(e => e.key === 'iron_mg')!.unit,
  potassium_mg: EXTRAS.find(e => e.key === 'potassium_mg')!.unit,
}

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

// The rows in label order. DVs for the three macros: fat 78 g, carbs 275 g, protein none.
export function labelRows(input: LabelInput): LabelRow[] {
  const rows: LabelRow[] = []

  // Which extras keys should be bold (per the spec table)
  const BOLD_EXTRAS = new Set(['cholesterol_mg', 'sodium_mg']) as Set<ExtraKey>

  function addExtra(
    key: ExtraKey,
    indent: 0 | 1 | 2,
    value: number | undefined
  ): void {
    const bold = BOLD_EXTRAS.has(key)
    if (value === undefined) {
      rows.push({
        key,
        label: EXTRA_LABELS[key],
        amount: null,
        dv: null,
        indent,
        bold,
        group: 'main',
      })
    } else {
      const unit = EXTRA_UNITS[key]
      const dvVal = EXTRA_DVS[key]
      rows.push({
        key,
        label: EXTRA_LABELS[key],
        amount: formatAmount(value, unit),
        dv: dvPercent(value, dvVal),
        indent,
        bold,
        group: 'main',
      })
    }
  }

  // Row order from the spec table
  // fat: Total Fat (indent 0, bold)
  rows.push({
    key: 'fat',
    label: 'Total Fat',
    amount: formatAmount(input.fat_g, 'g'),
    dv: dvPercent(input.fat_g, 78),
    indent: 0,
    bold: true,
    group: 'main',
  })

  // sat_fat_g: Saturated Fat (indent 1)
  addExtra('sat_fat_g', 1, input.extras['sat_fat_g'])

  // trans_fat_g: Trans Fat (indent 1)
  addExtra('trans_fat_g', 1, input.extras['trans_fat_g'])

  // cholesterol_mg: Cholesterol (indent 0)
  addExtra('cholesterol_mg', 0, input.extras['cholesterol_mg'])

  // sodium_mg: Sodium (indent 0)
  addExtra('sodium_mg', 0, input.extras['sodium_mg'])

  // carbs: Total Carbohydrate (indent 0, bold)
  rows.push({
    key: 'carbs',
    label: 'Total Carbohydrate',
    amount: formatAmount(input.carbs_g, 'g'),
    dv: dvPercent(input.carbs_g, 275),
    indent: 0,
    bold: true,
    group: 'main',
  })

  // fiber_g: Dietary Fiber (indent 1)
  addExtra('fiber_g', 1, input.extras['fiber_g'])

  // sugar_g: Total Sugars (indent 1)
  addExtra('sugar_g', 1, input.extras['sugar_g'])

  // added_sugar_g: Added Sugars (indent 2)
  addExtra('added_sugar_g', 2, input.extras['added_sugar_g'])

  // protein: Protein (indent 0, bold)
  rows.push({
    key: 'protein',
    label: 'Protein',
    amount: formatAmount(input.protein_g, 'g'),
    dv: null,
    indent: 0,
    bold: true,
    group: 'main',
  })

  // Vitamins group (indent 0, not bold)
  for (const key of ['vit_d_mcg', 'calcium_mg', 'iron_mg', 'potassium_mg'] as ExtraKey[]) {
    const value = input.extras[key]
    if (value === undefined) {
      rows.push({
        key,
        label: EXTRA_LABELS[key],
        amount: null,
        dv: null,
        indent: 0,
        bold: false,
        group: 'vitamins',
      })
    } else {
      const unit = EXTRA_UNITS[key]
      const dvVal = EXTRA_DVS[key]
      rows.push({
        key,
        label: EXTRA_LABELS[key],
        amount: formatAmount(value, unit),
        dv: dvPercent(value, dvVal),
        indent: 0,
        bold: false,
        group: 'vitamins',
      })
    }
  }

  return rows
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
