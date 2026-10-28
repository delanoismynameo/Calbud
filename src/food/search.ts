import { searchUsda } from './usda'
import { searchOff } from './off'
import type { FoodResult } from './types'

export function usdaApiKey(): string {
  const raw = import.meta.env.VITE_USDA_API_KEY as unknown as string | undefined
  if (raw == null || raw === '') return 'DEMO_KEY'
  return raw
}

type SearchUsdaArgs = { apiKey: string; fetchFn?: typeof fetch }
type SearchOffArgs = { fetchFn?: typeof fetch }

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

  const [usdaResult, offResult] = await Promise.allSettled([
    searchUsda(trimmed, { apiKey: key, fetchFn }),
    searchOff(trimmed, { fetchFn }),
  ])

  const results: FoodResult[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  if (usdaResult.status === 'fulfilled') {
    for (const r of usdaResult.value) {
      if (results.length >= 25) break
      const dk = dedupKey(r)
      if (!seen.has(dk)) {
        seen.add(dk)
        results.push(r)
      }
    }
  } else {
    errors.push(usdaResult.reason instanceof Error ? usdaResult.reason.message : 'USDA search failed')
  }

  if (offResult.status === 'fulfilled') {
    for (const r of offResult.value) {
      if (results.length >= 25) break
      const dk = dedupKey(r)
      if (!seen.has(dk)) {
        seen.add(dk)
        results.push(r)
      }
    }
  } else {
    errors.push(offResult.reason instanceof Error ? offResult.reason.message : 'Open Food Facts search failed')
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(errors.join('; '))
  }

  return { results: results.slice(0, 25), errors }
}
