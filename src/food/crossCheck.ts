import type { FoodResult } from './types'

const SOURCE_NAME = { off: 'Open Food Facts', usda: 'USDA', custom: 'Your saved food' }

// A plain-words warning when two sources disagree a lot about calories, or null when they agree.
export function sourceMismatch(a: FoodResult, b: FoodResult): string | null {
  const diff = Math.abs(a.kcal100g - b.kcal100g)
  const bigger = Math.max(a.kcal100g, b.kcal100g)
  if (bigger <= 0 || diff < 20 || diff / bigger <= 0.15) return null
  return SOURCE_NAME[a.source] + ' says ' + Math.round(a.kcal100g) + ' kcal per 100 g but ' + SOURCE_NAME[b.source] + ' says ' + Math.round(b.kcal100g) + '.'
}
