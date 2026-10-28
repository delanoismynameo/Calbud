import { searchUsda } from './usda'
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
  }: { apiKey?: string; fetchFn?: typeof fetch; signal?: AbortSignal },
): Promise<{ results: FoodResult[]; errors: string[] }> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return { results: [], errors: [] }
  }

  const key = apiKey ?? usdaApiKey()

  const [genericResult, brandedResult] = await Promise.allSettled([
    searchUsda(trimmed, { apiKey: key, fetchFn, signal, kind: 'generic' }),
    searchUsda(trimmed, { apiKey: key, fetchFn, signal, kind: 'branded' }),
  ])

  const results: FoodResult[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  if (genericResult.status === 'fulfilled') {
    for (const r of genericResult.value) {
      if (results.length >= 30) break
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
      if (results.length >= 30) break
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

  return { results: results.slice(0, 30), errors }
}
