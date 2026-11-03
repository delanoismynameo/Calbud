import { searchUsda, matchesBrand } from './usda'
import { splitQuery, rankResults } from './rank'
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
    brand,
  }: { apiKey?: string; fetchFn?: typeof fetch; signal?: AbortSignal; brand?: string },
): Promise<{ results: FoodResult[]; errors: string[] }> {
  const trimmed = query.trim()
  if (trimmed.length < 2 && !brand) {
    return { results: [], errors: [] }
  }

  const key = apiKey ?? usdaApiKey()
  const { core } = splitQuery(trimmed)
  const brandTrimmed = brand?.trim()

  // When brand is provided, only search branded foods (hide basic/generic foods)
  // When brand is empty, search both generic and branded
  const promises = brandTrimmed
    ? [null, searchUsda(trimmed, {
        apiKey: key,
        fetchFn,
        signal,
        kind: 'branded',
        brandOwner: brandTrimmed,
      })]
    : [
        searchUsda(core, { apiKey: key, fetchFn, signal, kind: 'generic' }),
        searchUsda(trimmed, { apiKey: key, fetchFn, signal, kind: 'branded' }),
      ]

  const [genericResult, brandedResult] = await Promise.allSettled(promises as Promise<any>[])

  const results: FoodResult[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  if (brandTrimmed) {
    // When brand is provided, generic results should not exist (we skip the search)
    // But if somehow there are errors from generic, ignore them since we're not searching it
  } else {
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
  }

  if (brandedResult.status === 'fulfilled') {
    for (const r of brandedResult.value) {
      // When brand is provided, filter by brand using loose matching
      if (brandTrimmed && !matchesBrand(brandTrimmed, r.brand)) continue
      const dk = dedupKey(r)
      if (!seen.has(dk)) {
        seen.add(dk)
        results.push(r)
      }
    }
  } else {
    errors.push(`Packaged foods: ${brandedResult.reason instanceof Error ? brandedResult.reason.message : 'USDA search failed'}`)
  }

  // Throw only when both sources failed; one source finding nothing is a normal empty result.
  if (errors.length === 2) {
    throw new Error(errors.join('; '))
  }

  return { results: rankResults(results, trimmed).slice(0, 30), errors }
}
