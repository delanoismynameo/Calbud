import type { ExtraInputs, Extras } from './extras'
import type { LabelRow } from './label'
import { labelRows } from './label'
import { EXTRAS } from './extras'

export interface PreviewInput { servingLabel: string; servingG: string; kcal: string; protein: string; carbs: string; fat: string }

function readNumber(s: string): number | null {
  const trimmed = s.trim()
  if (trimmed === '') return null
  const withDot = trimmed.replace(',', '.')
  const n = Number(withDot)
  return isFinite(n) && n >= 0 ? n : null
}

export function previewLabel(input: PreviewInput, extraInputs: ExtraInputs): { kcal: number; servingText: string; rows: LabelRow[] } | null {
  const kcalValue = readNumber(input.kcal)
  if (kcalValue === null) return null

  // Build extras from usable typed extra values (already per-serving, no scaling).
  const extras: Extras = {}
  for (const info of EXTRAS) {
    const raw = extraInputs[info.key]
    if (raw !== undefined) {
      const n = readNumber(raw)
      if (n !== null) {
        extras[info.key] = n
      }
    }
  }

  // Macro values default to 0 when not usable.
  const proteinNum = readNumber(input.protein) ?? 0
  const carbsNum = readNumber(input.carbs) ?? 0
  const fatNum = readNumber(input.fat) ?? 0

  // Build servingText.
  let servingText: string
  const trimmedLabel = input.servingLabel.trim()
  if (trimmedLabel === '') {
    servingText = '1 serving'
  } else {
    servingText = trimmedLabel
  }
  const gValue = readNumber(input.servingG)
  if (gValue !== null && gValue > 0) {
    servingText += ' (' + Math.round(gValue) + ' g)'
  }

  const rows = labelRows({ fat_g: fatNum, carbs_g: carbsNum, protein_g: proteinNum, extras })

  return { kcal: kcalValue, servingText, rows }
}
