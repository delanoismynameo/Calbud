import { searchUsda } from './usda'
import { searchOff } from './off'
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

type Source = { label: string; run: Promise<FoodResult[]> }

/**
 * Runs the sources at once and merges them: the first `lead` sources in order, then the rest
 * taking turns, one food each. Ranking keeps that order for equally good matches and only 30
 * are shown, so taking turns stops one packaged source from filling the list. Drops repeats
 * (same name and brand) and, with `keep`, foods it rejects. Throws only when every source
 * failed; a source finding nothing is a normal empty result, and a failed one is reported in `errors`.
 */
async function merged(sources: Source[], { lead = 0, keep = () => true }: { lead?: number; keep?: (r: FoodResult) => boolean } = {}) {
  const settled = await Promise.allSettled(sources.map((s) => s.run))
  const errors: string[] = []
  const lists = settled.map((outcome, i) => {
    if (outcome.status === 'fulfilled') return outcome.value
    const why = outcome.reason instanceof Error ? outcome.reason.message : 'search failed'
    errors.push(`${sources[i].label}: ${why}`)
    return []
  })
  if (errors.length === sources.length) throw new Error(errors.join('; '))

  const ordered = lists.slice(0, lead).flat()
  const rest = lists.slice(lead)
  for (let i = 0; rest.some((list) => i < list.length); i++) {
    for (const list of rest) if (i < list.length) ordered.push(list[i])
  }
  const results: FoodResult[] = []
  const seen = new Set<string>()
  for (const r of ordered) {
    const dk = dedupKey(r)
    if (seen.has(dk) || !keep(r)) continue
    seen.add(dk)
    results.push(r)
  }
  return { results, errors }
}

/**
 * USDA's basic and packaged foods plus Open Food Facts' packaged foods (US products). OFF goes
 * through the off-search Edge Function, which needs the signed-in user's `offToken`; without one
 * only USDA is searched.
 */
export async function searchFoods(
  query: string,
  {
    apiKey,
    fetchFn = fetch,
    signal,
    brand = '',
    offToken,
  }: { apiKey?: string; fetchFn?: typeof fetch; signal?: AbortSignal; brand?: string; offToken?: string },
): Promise<{ results: FoodResult[]; errors: string[] }> {
  const trimmed = query.trim()
  const key = apiKey ?? usdaApiKey()
  const off = (words: string, offBrand = ''): Source[] =>
    offToken ? [{ label: 'Open Food Facts', run: searchOff(words, { brand: offBrand, token: offToken, fetchFn, signal }) }] : []

  // With a brand: only packaged foods from that brand, and a brand alone (no food words) lists its products.
  if (brandQuery(brand, '') !== '') {
    const { results, errors } = await merged([
      { label: 'Packaged foods', run: searchUsda(brandQuery(brand, trimmed), { apiKey: key, fetchFn, signal, kind: 'branded' }) },
      ...off(trimmed, brand),
    ], { keep: (r) => matchesBrand(brand, r) })
    return { results: rankResults(results, trimmed || brand).slice(0, 30), errors }
  }

  if (trimmed.length < 2) {
    return { results: [], errors: [] }
  }

  const { core } = splitQuery(trimmed)
  const { results, errors } = await merged([
    { label: 'Basic foods', run: searchUsda(core, { apiKey: key, fetchFn, signal, kind: 'generic' }) },
    { label: 'Packaged foods', run: searchUsda(trimmed, { apiKey: key, fetchFn, signal, kind: 'branded' }) },
    ...off(trimmed),
  ], { lead: 1 })
  return { results: rankResults(results, trimmed).slice(0, 30), errors }
}
