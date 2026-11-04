import { searchUsda } from './usda'
import { searchOff, offBrandTag } from './off'
import { splitQuery, rankResults } from './rank'
import { brandQuery, matchesBrand } from './brand'
import type { FoodResult } from './types'

export function usdaApiKey(): string {
  const raw = import.meta.env.VITE_USDA_API_KEY as unknown as string | undefined
  if (raw == null || raw === '') return 'DEMO_KEY'
  return raw
}

function dedupKey(r: FoodResult): string {
  const name = (r.name ?? '').trim().toLowerCase()
  const brand = (r.brand ?? '').trim().toLowerCase()
  return name + '|' + brand
}

export async function searchFoods(
  query: string,
  {
    apiKey,
    fetchFn = fetch,
    signal,
    brand = '',
  }: { apiKey?: string; fetchFn?: typeof fetch; signal?: AbortSignal; brand?: string },
): Promise<{ results: FoodResult[]; errors: string[] }> {
  const trimmed = query.trim()
  const brandTrimmed = brand.trim()
  const key = apiKey ?? usdaApiKey()

  // With a brand: also search OFF with the brand tag for packaged foods
  if (brandQuery(brandTrimmed, '') !== '') {
    const [offResult, usdaResult] = await Promise.allSettled([
      searchOff(trimmed || brandTrimmed, { fetchFn, signal, brand: offBrandTag(brandTrimmed) }),
      searchUsda(brandQuery(brandTrimmed, trimmed), { apiKey: key, fetchFn, signal, kind: 'branded' }),
    ])

    const offResults: FoodResult[] = []
    if (offResult.status === 'fulfilled') {
      // Filter to only include foods from this brand
      const seen = new Set<string>()
      for (const r of offResult.value) {
        const dk = dedupKey(r)
        if (!seen.has(dk) && matchesBrand(brandTrimmed, r)) {
          seen.add(dk)
          offResults.push(r)
        }
      }
    }

    const usdaResults: FoodResult[] = []
    if (usdaResult.status === 'fulfilled') {
      const seen = new Set<string>()
      for (const r of usdaResult.value) {
        if (!seen.has(dedupKey(r)) && matchesBrand(brandTrimmed, r)) {
          seen.add(dedupKey(r))
          usdaResults.push(r)
        }
      }
    }

    // Merge OFF and USDA results, deduplicating
    const merged: FoodResult[] = [...offResults]
    for (const r of usdaResults) {
      const dk = dedupKey(r)
      let alreadySeen = false
      for (const existing of merged) {
        if (dedupKey(existing) === dk) {
          alreadySeen = true
          break
        }
      }
      if (!alreadySeen) {
        merged.push(r)
      }
    }

    const errors: string[] = []
    if (offResult.status === 'rejected') {
      errors.push(`Packaged foods: ${offResult.reason instanceof Error ? offResult.reason.message : 'Open Food Facts search failed'}`)
    }
    if (usdaResult.status === 'rejected') {
      errors.push(`Packaged foods: ${usdaResult.reason instanceof Error ? usdaResult.reason.message : 'USDA search failed'}`)
    }

    if (errors.length === 2) {
      throw new Error(errors.join('; '))
    }

    return { results: rankResults(merged, trimmed || brandTrimmed).slice(0, 30), errors }
  }

  if (trimmed.length < 2) {
    return { results: [], errors: [] }
  }

  const { core } = splitQuery(trimmed)

  // Search USDA and OFF in parallel
  const [genericResult, brandedResult, offResult] = await Promise.allSettled([
    searchUsda(core, { apiKey: key, fetchFn, signal, kind: 'generic' }),
    searchUsda(trimmed, { apiKey: key, fetchFn, signal, kind: 'branded' }),
    searchOff(trimmed, { fetchFn, signal }),
  ])

  const results: FoodResult[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  if (genericResult.status === 'fulfilled') {
    for (const r of genericResult.value) {
      const dk = dedupKey(r)
      if (!seen.has(dk)) {
        seen.add(dk)
        results.push(r)
      }
    }
  } else {
    errors.push(`Basic foods: ${genericResult.reason instanceof Error ? genericResult.reason.message : 'USDA search failed'}`)
  }

  if (brandedResult.status === 'fulfilled') {
    for (const r of brandedResult.value) {
      const dk = dedupKey(r)
      if (!seen.has(dk)) {
        seen.add(dk)
        results.push(r)
      }
    }
  } else {
    errors.push(`Packaged foods: ${brandedResult.reason instanceof Error ? brandedResult.reason.message : 'USDA search failed'}`)
  }

  if (offResult.status === 'fulfilled') {
    for (const r of offResult.value) {
      const dk = dedupKey(r)
      if (!seen.has(dk)) {
        seen.add(dk)
        results.push(r)
      }
    }
  } else {
    errors.push(`Packaged foods: ${offResult.reason instanceof Error ? offResult.reason.message : 'Open Food Facts search failed'}`)
  }

  // Throw if all sources failed
  if (genericResult.status === 'rejected' && brandedResult.status === 'rejected' && offResult.status === 'rejected') {
    throw new Error(errors.join('; '))
  }

  // Return results even if OFF failed; USDA results still show
  return { results: rankResults(results, trimmed).slice(0, 30), errors }
}
