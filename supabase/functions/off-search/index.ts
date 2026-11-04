// Searches Open Food Facts for packaged foods in the US.
// Only signed-in users may call it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Convert brand name to OFF tags format: lowercase, spaces and punctuation to dashes
function brandTag(brand: string): string {
  return brand
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

Deno.serve(async (req) => {
  // Get the user from the JWT token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const token = authHeader.substring('Bearer '.length)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Parse the request body
  const body = await req.json() as { q?: string; brand?: string }
  const q = body.q?.trim()
  const brand = body.brand?.trim()

  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing query parameter "q"' }), { status: 400 })
  }

  // Build the OFF search URL
  let url = 'https://search.openfoodfacts.org/search?json=true'
  const params = new URLSearchParams()

  params.append('q', q)
  params.append('countries_tags', 'en:united-states')
  params.append('page_size', '20')
  params.append('langs', 'en')
  params.append('fields', 'code,product_name,brands,nutriments,images,quantity,product_quantity_unit')

  if (brand) {
    params.append('brands_tags', brandTag(brand))
  }

  url += '&' + params.toString()

  // Make the request with custom User-Agent
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Calbud/1.0'
    }
  })

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Open Food Facts search failed' }), { status: 500 })
  }

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})