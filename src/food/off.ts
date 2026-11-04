import type { FoodResult } from './types'
import { extrasFromOff } from './extras'

const gramRegex = /\d\s*(g|gr|grams?)\b/i
const mlRegex = /\d\s*(ml|cl)\b/i

// Detects if a product is a liquid based on serving_size, quantity, and product_quantity_unit.
// Returns true for products that should be labeled in 'ml' instead of 'g'.
function isLiquidProduct(product: Record<string, unknown>): boolean {
  // Check serving_size for "ml", "cl", or "l"
  const servingSize = String(product.serving_size ?? '')
  if (mlRegex.test(servingSize)) return true
  if (/\d\s*l\b/i.test(servingSize)) return true

  // Check product_quantity_unit for "ml", "cl", or "l"
  const qtyUnit = String(product.product_quantity_unit ?? '').toLowerCase()
  if (['ml', 'cl', 'l'].includes(qtyUnit)) return true

  // Check quantity string for liquid indicators
  const quantity = String(product.quantity ?? '')
  if (mlRegex.test(quantity)) return true
  if (/\d\s*(ml|cl|l)\b/i.test(quantity)) return true

  return false
}

// Generates a small (200px) image URL from Open Food Facts product data.
// The images field contains front image info with imgid and rev, used to construct the URL.
// Returns null if no front image is available.
function extractImageUrl(code: string, product: Record<string, unknown>): string | null {
  const images = (product.images as Record<string, unknown>) ?? {}
  
  // Try different front image keys (with language codes and without)
  const frontKey = Object.keys(images).find(key => 
    key === 'front' || key.startsWith('front_') || key.startsWith('images/front_')
  )
  
  if (!frontKey) return null
  
  const frontImg = images[frontKey] as Record<string, unknown> | undefined
  if (!frontImg || typeof frontImg !== 'object') return null
  
  const rev = frontImg['rev']
  const imgid = frontImg['imgid']
  
  if (typeof rev !== 'string' && typeof rev !== 'number' ||
      typeof imgid !== 'string' && typeof imgid !== 'number') {
    return null
  }
  
  // Open Food Facts keeps codes of 8 digits or fewer in one folder, longer ones padded to 13 and split 3/3/3/rest
  const trimmedCode = code.trim()
  const paddedCode = trimmedCode.padStart(13, '0')
  const folder = trimmedCode.length <= 8
    ? trimmedCode
    : `${paddedCode.slice(0, 3)}/${paddedCode.slice(3, 6)}/${paddedCode.slice(6, 9)}/${paddedCode.slice(9)}`

  // 200px is a good size for thumbnails
  const filename = `${frontKey}.${rev}.200.jpg`
  return `https://images.openfoodfacts.org/images/products/${folder}/${filename}`
}

export function offServingLabel(sizeText: string, servingG: number, unit: 'g' | 'ml' = 'g'): string {
  const trimmed = sizeText.trim()
  if (trimmed === '') return `1 serving (${servingG} ${unit})`
  // Check if sizeText already has the correct unit
  const unitRegex = unit === 'ml' ? mlRegex : gramRegex
  if (unitRegex.test(trimmed)) return trimmed
  return `${trimmed} (${servingG} ${unit})`
}

type OffSearchResponse = Record<string, unknown>
type OffProductResponse = Record<string, unknown>

function extractBrand(raw: unknown): string | null {
  if (Array.isArray(raw)) {
    const first = raw[0] ?? ''
    const trimmed = String(first).trim()
    return trimmed !== '' ? trimmed : null
  }
  if (typeof raw === 'string') {
    const part = raw.split(',')[0].trim()
    return part !== '' ? part : null
  }
  return null
}

function toNum(val: unknown): number | undefined {
  return typeof val === 'number' && isFinite(val) ? val : undefined
}

export function normalizeOffProduct(raw: unknown): FoodResult | null {
  if (typeof raw !== 'object' || raw === null) return null

  // Some responses wrap the product in a .product key; otherwise use raw directly.
  const productRaw = raw as Record<string, unknown>
  const product: Record<string, unknown> = (productRaw.product ?? raw) as Record<string, unknown>
  const rawCode = productRaw.code
  let code: string
  if (typeof rawCode === 'string') {
    code = rawCode
  } else {
    const prodCode = product.code
    code = typeof prodCode === 'string' ? prodCode : ''
  }
  if (code === '') return null

  const name = typeof (product as Record<string, unknown>).product_name === 'string'
    ? (product as Record<string, unknown>).product_name as string
    : null
  if (!name) return null

  const nutriments = ((product as Record<string, unknown>).nutriments as Record<string, unknown>) ?? {}

  let energyKcal: number
  const kcalVal = toNum(nutriments['energy-kcal_100g'])
  if (kcalVal !== undefined) {
    energyKcal = kcalVal
  } else {
    const kjVal = toNum(nutriments['energy-kj_100g'])
    if (kjVal !== undefined) {
      energyKcal = Math.round(kjVal / 4.184 * 10) / 10
    } else {
      return null
    }
  }

  const protein = toNum(nutriments['proteins_100g'])
  const carbs = toNum(nutriments['carbohydrates_100g'])
  const fatVal = toNum(nutriments['fat_100g'])
  if (protein === undefined || carbs === undefined || fatVal === undefined) return null

  const fiber = toNum(nutriments['fiber_100g']) ?? null
  const sugar = toNum(nutriments['sugars_100g']) ?? null

  const sodiumG = toNum(nutriments['sodium_100g'])
  const sodiumMg = sodiumG !== undefined ? Math.round(sodiumG * 1000 * 10) / 10 : null

  let servingG: number | null = null
  let servingLabel: string | null = null
  
  // Detect if this is a liquid product (e.g., water, juice, soda)
  const unit: 'g' | 'ml' = isLiquidProduct(product) ? 'ml' : 'g'
  
  const servingQtyRaw = (product as Record<string, unknown>).serving_quantity as number | undefined
  if (servingQtyRaw !== undefined && isFinite(servingQtyRaw) && servingQtyRaw > 0) {
    servingG = Math.round(servingQtyRaw * 10) / 10
    const sizeText = String((product as Record<string, unknown>).serving_size ?? '')
    servingLabel = offServingLabel(sizeText, servingG, unit)
  }

  const brandsRaw = (product as Record<string, unknown>).brands as unknown
  const brand = extractBrand(brandsRaw)

  const imageUrl = extractImageUrl(code, product)

  return {
    source: 'off',
    sourceId: code,
    name,
    brand,
    servingG,
    servingLabel,
    unit,
    kcal100g: energyKcal,
    protein100g: protein,
    carbs100g: carbs,
    fat100g: fatVal,
    fiber100g: fiber,
    sugar100g: sugar,
    sodiumMg100g: sodiumMg,
    barcode: code,
    extras100g: extrasFromOff(nutriments),
    imageUrl,
  }
}

type RequestOpts = { fetchFn?: typeof fetch; signal?: AbortSignal }

type OffSearchOpts = { fetchFn?: typeof fetch; signal?: AbortSignal }

// Convert brand name to OFF tags format: lowercase, spaces and punctuation to dashes
export function offBrandTag(brand: string): string {
  return brand
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function searchOff(
  query: string,
  { brand = '', fetchFn = fetch, signal }: OffSearchOpts & { brand?: string } = {},
): Promise<FoodResult[]> {
  const trimmed = query.trim()

  if (trimmed.length === 0) return []

  // Build the URL for the edge function
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/off-search`
  const body: { q: string; brand?: string } = { q: trimmed }
  if (brand.trim()) {
    body.brand = offBrandTag(brand)
  }

  const res = await fetchFn(baseUrl, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Open Food Facts search failed (HTTP ${res.status})`)
  }

  const data = await res.json() as OffSearchResponse

  // The hits array contains the search results
  const hits = (data.hits as OffProductResponse[]) ?? []

  // Normalize each hit to a FoodResult
  const results: FoodResult[] = []
  for (const hit of hits) {
    const normalized = normalizeOffProduct(hit)
    if (normalized) {
      results.push(normalized)
    }
  }

  return results
}

export async function lookupBarcode(
  code: string,
  { fetchFn = fetch, signal }: RequestOpts = {},
): Promise<FoodResult | null> {
  if (code.trim() === '') return null
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code.trim())}.json?fields=code,product_name,brands,serving_size,serving_quantity,quantity,product_quantity_unit,nutriments,images`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  signal?.addEventListener('abort', () => controller.abort())
  let res: Response
  try { res = await fetchFn(url, { signal: controller.signal }) }
  finally { clearTimeout(timer) }
  let data: OffProductResponse

  // Parse before checking the status: an unknown barcode is HTTP 404 with { status: 0 }.
  try {
    data = (await res.json()) as OffProductResponse
  } catch {
    throw new Error(`Open Food Facts lookup failed (HTTP ${res.status})`)
  }

  if (data.status === 0) return null

  if (!res.ok) {
    throw new Error(`Open Food Facts lookup failed (HTTP ${res.status})`)
  }

  const productOrRaw = data.product ?? data
  return normalizeOffProduct({ ...productOrRaw, code: code.trim() })
}
