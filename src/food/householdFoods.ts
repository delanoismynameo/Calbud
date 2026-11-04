import type { FoodResult } from './types'
import { words, matchScore } from './rank'
import { foodKey } from './favorites'

export function matchesQuery(food: FoodResult, query: string): boolean {
  const nameWords = words(food.name + ' ' + (food.brand ?? ''))
  const queryWords = words(query)
  if (queryWords.length === 0) return false
  return queryWords.every((qw) => nameWords.some((nw) => nw.startsWith(qw)))
}

export function householdMatches(foods: FoodResult[], query: string, limit = 8): FoodResult[] {
  if (query.trim().length < 2) return []
  const matched = foods.map((f, i) => ({ f, i })).filter(({ f }) => matchesQuery(f, query))
  matched.sort((a, b) => {
    const sa = matchScore(a.f, query)
    const sb = matchScore(b.f, query)
    if (sb !== sa) return sb - sa
    return a.i - b.i
  })
  return matched.slice(0, limit).map(m => m.f)
}

export function withoutHousehold(results: FoodResult[], household: FoodResult[]): FoodResult[] {
  const keys = new Set(household.map(foodKey))
  return results.filter((f) => !keys.has(foodKey(f)))
}

// Search results that are foods the household already saved with its own photo get that photo,
// so a USDA food you photographed on Today shows your photo in the next search.
export function withSavedPhotos(results: FoodResult[], household: FoodResult[]): FoodResult[] {
  const photos = new Map<string, string>()
  for (const f of household) if (f.photoUrl) photos.set(foodKey(f), f.photoUrl)
  if (photos.size === 0) return results
  return results.map((f) => {
    const photo = photos.get(foodKey(f))
    return photo && !f.photoUrl ? { ...f, photoUrl: photo } : f
  })
}
