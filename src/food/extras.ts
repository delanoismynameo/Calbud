export type ExtraKey = 'sat_fat_g' | 'trans_fat_g' | 'cholesterol_mg' | 'sodium_mg' | 'fiber_g' | 'sugar_g'
  | 'added_sugar_g' | 'vit_d_mcg' | 'calcium_mg' | 'iron_mg' | 'potassium_mg'

export type Extras = Partial<Record<ExtraKey, number>>

export interface ExtraInfo { key: ExtraKey; label: string; unit: 'g' | 'mg' | '\u00b5g'; dv: number | null; usda: number; off: string; offScale: number }

export const EXTRAS: ExtraInfo[] = [
  { key: 'sat_fat_g', label: 'Saturated fat', unit: 'g', dv: 20, usda: 1258, off: 'saturated-fat_100g', offScale: 1 },
  { key: 'trans_fat_g', label: 'Trans fat', unit: 'g', dv: null, usda: 1257, off: 'trans-fat_100g', offScale: 1 },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', dv: 300, usda: 1253, off: 'cholesterol_100g', offScale: 1000 },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', dv: 2300, usda: 1093, off: 'sodium_100g', offScale: 1000 },
  { key: 'fiber_g', label: 'Fiber', unit: 'g', dv: 28, usda: 1079, off: 'fiber_100g', offScale: 1 },
  { key: 'sugar_g', label: 'Sugar', unit: 'g', dv: null, usda: 2000, off: 'sugars_100g', offScale: 1 },
  { key: 'added_sugar_g', label: 'Added sugar', unit: 'g', dv: 50, usda: 1235, off: 'added-sugars_100g', offScale: 1 },
  { key: 'vit_d_mcg', label: 'Vitamin D', unit: '\u00b5g', dv: 20, usda: 1114, off: 'vitamin-d_100g', offScale: 1000000 },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', dv: 1300, usda: 1087, off: 'calcium_100g', offScale: 1000 },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', dv: 18, usda: 1089, off: 'iron_100g', offScale: 1000 },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', dv: 4700, usda: 1092, off: 'potassium_100g', offScale: 1000 },
]

const EXTRA_KEYS = new Set(EXTRAS.map((e) => e.key))

export function extrasFromUsda(nutrients: Map<number, number>): Extras {
  const result: Extras = {}
  for (const info of EXTRAS) {
    const v = nutrients.get(info.usda)
    if (v !== undefined) {
      result[info.key] = Math.round(v * 100) / 100
    }
  }
  return result
}

export function extrasFromOff(nutriments: Record<string, unknown>): Extras {
  const result: Extras = {}
  for (const info of EXTRAS) {
    const raw = nutriments[info.off]
    let v: number | undefined
    if (typeof raw === 'number') {
      v = raw
    } else if (typeof raw === 'string') {
      const parsed = Number(raw)
      if (isFinite(parsed)) v = parsed
    }
    if (v !== undefined && isFinite(v) && v >= 0) {
      result[info.key] = Math.round(v * info.offScale * 100) / 100
    }
  }
  return result
}

export function cleanExtras(raw: unknown): Extras {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const result: Extras = {}
  for (const key of EXTRA_KEYS) {
    const v = (raw as Record<string, unknown>)[key]
    if (typeof v === 'number' && isFinite(v) && v >= 0) {
      result[key] = v
    }
  }
  return result
}

export type ExtraInputs = Partial<Record<ExtraKey, string>>

export function parseExtraInputs(inputs: ExtraInputs, servingG: number):
  | { ok: true; extras100g: Extras }
  | { ok: false; errors: Partial<Record<ExtraKey, string>> } {
  const extras100g: Extras = {}
  const errors: Partial<Record<ExtraKey, string>> = {}
  for (const info of EXTRAS) {
    const raw = inputs[info.key]
    if (raw === undefined || raw.trim() === '') continue
    const withDot = raw.replace(',', '.')
    const v = Number(withDot)
    if (!isFinite(v) || v < 0 || v > 100000) {
      errors[info.key] = 'Enter a number (or leave it blank).'
      continue
    }
    extras100g[info.key] = Math.round(v / servingG * 100 * 100) / 100
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, extras100g }
}

export function extrasPerServing(extras100g: Extras, servingG: number): ExtraInputs {
  const result: ExtraInputs = {}
  for (const key in extras100g) {
    const val = (extras100g as Record<string, unknown>)[key]
    if (val !== undefined && typeof val === 'number') {
      result[key as ExtraKey] = String(Math.round(val * servingG / 100 * 10) / 10)
    }
  }
  return result
}

export function scaleExtras(extras: Extras, grams: number): Extras {
  const result: Extras = {}
  for (const key of EXTRA_KEYS) {
    const v = extras[key]
    if (v !== undefined) {
      result[key] = Math.round(v * grams / 100 * 10) / 10
    }
  }
  return result
}

export function sumExtras(list: Extras[]): { info: ExtraInfo; total: number; missing: number }[] {
  const result: { info: ExtraInfo; total: number; missing: number }[] = []
  for (const info of EXTRAS) {
    let total = 0
    let missing = 0
    for (const item of list) {
      if (info.key in item && typeof item[info.key] === 'number') {
        total += item[info.key]!
      } else {
        missing += 1
      }
    }
    result.push({ info, total: Math.round(total * 10) / 10, missing })
  }
  return result
}

export function dvPercent(total: number, dv: number | null): number | null {
  if (dv === null) return null
  return Math.round(total / dv * 100)
}
