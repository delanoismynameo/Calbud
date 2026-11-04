// Searches Open Food Facts for US packaged foods, for the app's food search.
// Browsers can't call OFF's search themselves (it sends no CORS header), so the app calls this.
// Only signed-in users: the gateway checks the JWT (verify_jwt, the default) and so does getUser below.
//
// POST { q: string, brand?: string } -> { hits: [...] } (OFF's search hits, only the fields the app reads)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FIELDS = 'code,product_name,brands,nutriments,images,quantity,product_quantity_unit'

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

/** OFF's brand tag: lowercase, every run of other characters a dash ("Trader Joe's" -> "trader-joe-s"). */
function brandTag(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * The search text. Filters only work inside q (as separate URL parameters OFF ignores them).
 * Quotes and colons are dropped from the words so they can't add filters of their own.
 */
function searchText(words: string, brand: string): string {
  const parts = [words.replace(/["':]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)]
  parts.push('countries_tags:"en:united-states"')
  const tag = brandTag(brand)
  if (tag) parts.push(`brands_tags:"${tag}"`)
  return parts.filter(Boolean).join(' ')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply(405, { error: 'Use POST' })

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return reply(401, { error: 'Sign in first' })

  let body: { q?: unknown; brand?: unknown }
  try { body = await req.json() } catch { return reply(400, { error: 'Send JSON' }) }
  const words = typeof body.q === 'string' ? body.q : ''
  const brand = typeof body.brand === 'string' ? body.brand : ''
  if (words.trim() === '' && brandTag(brand) === '') return reply(400, { error: 'Send q or brand' })

  const params = new URLSearchParams({ q: searchText(words, brand), page_size: '20', langs: 'en', fields: FIELDS })
  try {
    const res = await fetch(`https://search.openfoodfacts.org/search?${params}`, {
      headers: { 'User-Agent': 'Calbud/1.0 (household food log)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return reply(502, { error: `Open Food Facts answered ${res.status}` })
    const data = await res.json() as { hits?: unknown }
    return reply(200, { hits: Array.isArray(data.hits) ? data.hits : [] })
  } catch {
    return reply(502, { error: 'Open Food Facts did not answer' })
  }
})
