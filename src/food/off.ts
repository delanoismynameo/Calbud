import type { FoodResult } from './types'

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
  const servingQtyRaw = (product as Record<string, unknown>).serving_quantity as number | undefined
  if (servingQtyRaw !== undefined && isFinite(servingQtyRaw) && servingQtyRaw > 0) {
    servingG = Math.round(servingQtyRaw * 10) / 10
    const sizeText = String((product as Record<string, unknown>).serving_size ?? '')
    servingLabel = sizeText !== '' ? `${sizeText} (${servingG} g)` : `1 serving (${servingG} g)`
  }

  const brandsRaw = (product as Record<string, unknown>).brands as unknown
  const brand = extractBrand(brandsRaw)

  return {
    source: 'off',
    sourceId: code,
    name,
    brand,
    servingG,
    servingLabel,
    kcal100g: energyKcal,
    protein100g: protein,
    carbs100g: carbs,
    fat100g: fatVal,
    fiber100g: fiber,
    sugar100g: sugar,
    sodiumMg100g: sodiumMg,
    barcode: code,
  }
}

export async function searchOff(query: string, { fetchFn = fetch }: { fetchFn?: typeof fetch }): Promise<FoodResult[]> {
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(
    query,
  )}&page_size=20&fields=code,product_name,brands,serving_size,serving_quantity,nutriments`

  const res = await fetchFn(url)
  if (!res.ok) {
    throw new Error(`Open Food Facts search failed (${res.status})`)
  }

  const data = await res.json() as OffSearchResponse
  const hits = Array.isArray(data.hits) ? data.hits : []
  return hits.map(normalizeOffProduct).filter((r): r is FoodResult => r !== null)
}

export async function lookupBarcode(
  code: string,
  { fetchFn = fetch }: { fetchFn?: typeof fetch },
): Promise<FoodResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,brands,serving_size,serving_quantity,nutriments`

  const res = await fetchFn(url)
  let data: OffProductResponse

  try {
    data = (await res.json()) as OffProductResponse
  } catch {
    if (!res.ok) throw new Error(`Open Food Facts lookup failed (${res.status})`)
    throw new Error('Open Food Facts lookup failed')
  }

  if (data.status === 0) return null

  if (!res.ok) {
    throw new Error(`Open Food Facts lookup failed (${res.status})`)
  }

  const productOrRaw = data.product ?? data
  if (typeof code !== 'string' || code === '') return null
  return normalizeOffProduct({ ...productOrRaw, code })
}
