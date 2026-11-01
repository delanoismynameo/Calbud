import type { FoodResult } from './types'

// A plain-words warning when a food's serving looks wrong, or null when it looks fine.
export function servingWarning(food: FoodResult): string | null {
  const g = food.servingG
  const label = food.servingLabel
  if (g == null) {
    return label != null ? 'This serving has a name but no weight.' : null
  }
  if (g > 1000) return `This serving is ${Math.round(g)} g, which is very large.`
  if (label != null) {
    const m = label.match(/(?<![a-z])(\d+(?:[.,]\d+)?)\s*g\b/i)
    if (m) {
      const said = Number(m[1].replace(',', '.'))
      if (Number.isFinite(said) && said > 0 && Math.abs(said - g) / g > 0.1) {
        return `The serving name says ${said} g but the serving is set to ${Math.round(g * 10) / 10} g.`
      }
    }
  }
  return null
}