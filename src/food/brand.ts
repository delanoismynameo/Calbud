import { words } from './rank'
import type { FoodResult } from './types'

// True when every word of `brand` starts a word of the food's brand or name, ignoring case:
// "kirkland" matches "Kirkland Signature", "great value" matches "Great Value". An empty brand matches nothing.
export function matchesBrand(brand: string, food: FoodResult): boolean {
  const brandWords = words(brand)
  if (brandWords.length === 0) return false
  const foodWords = words((food.brand ?? '') + ' ' + food.name)
  return brandWords.every((bw) => foodWords.some((fw) => fw.startsWith(bw)))
}

// The USDA query for a brand search: each brand word is required ("+chobani"), the food words are not.
// USDA's brandOwner filter is not used because it matches the parent company: "kirkland" finds nothing there,
// since Kirkland Signature foods are listed under "Costco Companies Inc.".
export function brandQuery(brand: string, query: string): string {
  const required = brand.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1).map((w) => '+' + w)
  return [...required, query.trim()].filter((p) => p !== '').join(' ')
}
