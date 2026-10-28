// Downloads real API responses into the repo's fixture folder (pretty-printed, trimmed to 5 results).
// Usage: node scripts/save-food-fixtures.mjs . off|usda
// The USDA key is read from <repo>/.env.local (VITE_USDA_API_KEY) or falls back to DEMO_KEY; it is never printed.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const [repo, which] = process.argv.slice(2)
const dir = path.join(repo, 'src', 'food', '__fixtures__')
mkdirSync(dir, { recursive: true })
const UA = { 'User-Agent': 'Calbud/0.1 (personal calorie tracker; fixture capture)' }

const save = (name, data) => {
  writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + '\n')
  console.log('saved', name)
}
const get = async (url, init) => {
  const res = await fetch(url, { ...init, headers: { ...UA, ...(init?.headers ?? {}) } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.replace(/api_key=[^&]+/, 'api_key=***')}`)
  return res.json()
}

if (which === 'off') {
  const fields = 'code,product_name,brands,serving_size,serving_quantity,nutriments'
  const search = await get(`https://search.openfoodfacts.org/search?q=oatmeal&page_size=5&fields=${fields}`)
  save('off-search-oatmeal.json', { ...search, hits: search.hits.slice(0, 5), aggregations: undefined, facets: undefined, charts: undefined, debug: undefined })
  save('off-product-nutella.json', await get(`https://world.openfoodfacts.org/api/v2/product/3017620422003.json?fields=${fields}`))
  save('off-product-not-found.json', await get('https://world.openfoodfacts.org/api/v2/product/0000000000000.json').catch(async () => {
    // OFF answers 404 with a JSON body for unknown barcodes; capture that body.
    const res = await fetch('https://world.openfoodfacts.org/api/v2/product/0000000000000.json', { headers: UA })
    return res.json()
  }))
}

if (which === 'usda-branded') {
  const envFile = path.join(repo, '.env.local')
  const key = (existsSync(envFile) ? readFileSync(envFile, 'utf8').match(/^VITE_USDA_API_KEY=(.+)$/m)?.[1]?.trim() : undefined) || 'DEMO_KEY'
  for (const q of ['oatmeal', 'greek yogurt']) {
    const body = { query: q, dataType: ['Branded'], pageSize: 5 }
    const data = await get(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    save(`usda-branded-${q.replace(/\s+/g, '-')}.json`, { ...data, foods: data.foods.slice(0, 5), aggregations: undefined })
  }
}

if (which === 'usda') {
  const envFile = path.join(repo, '.env.local')
  const fromEnv = existsSync(envFile) ? readFileSync(envFile, 'utf8').match(/^VITE_USDA_API_KEY=(.+)$/m)?.[1]?.trim() : undefined
  const key = fromEnv || 'DEMO_KEY'
  console.log('using', fromEnv ? 'key from .env.local' : 'DEMO_KEY')
  for (const q of ['egg', 'banana']) {
    const body = { query: q, dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'], pageSize: 5 }
    const data = await get(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    save(`usda-search-${q}.json`, { ...data, foods: data.foods.slice(0, 5), aggregations: undefined })
  }
}
