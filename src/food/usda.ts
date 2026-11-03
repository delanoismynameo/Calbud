import type { FoodResult } from './types'
import { extrasFromUsda } from './extras'

interface UsdaFoodNutrient {
  nutrientId: number
  value: number
}

interface UsdaFoodMeasure {
  rank: number
  gramWeight: number | null
  disseminationText: string
}

interface UsdaFoodItem {
  fdcId: number
  description: string
  brandOwner?: string
  servingSize?: number
  servingSizeUnit?: string
  foodMeasures?: UsdaFoodMeasure[]
  foodNutrients: UsdaFoodNutrient[]
}

type UsdaSearchResponse = { foods: readonly unknown[] }

/** Title-case a string that has no lowercase letters. Does not capitalise after apostrophe. */
export function titleCase(s: string): string {
  const lower = s.toLowerCase()
  let result = ''
  for (let i = 0; i < lower.length; i++) {
    if (i === 0 || /\s|-|\/|\(|&/.test(lower[i - 1])) {
      result += lower[i].toUpperCase()
    } else {
      result += lower[i]
    }
  }
  return result
}

function toTitle(name: string | null): string | null {
  if (name === null) return null
  // Only apply when the original has no lowercase letters
  if ([...name].some(c => c >= 'a' && c <= 'z')) return name
  return titleCase(name)
}

function isUsdaFoodItem(raw: unknown): raw is UsdaFoodItem {
  return typeof raw === 'object' && raw !== null && 'fdcId' in raw
}

export function normalizeUsdaFood(raw: unknown): FoodResult | null {
  if (!isUsdaFoodItem(raw)) return null

  const nutrients = new Map<number, number>()
  for (const n of raw.foodNutrients ?? []) {
    if (typeof n === 'object' && n !== null && 'nutrientId' in n && 'value' in n) {
      const entry = n as unknown as Record<string, unknown>
      const nid = entry.nutrientId
      const val = entry.value
      if (typeof nid === 'number' && typeof val === 'number') {
        nutrients.set(nid, val)
      }
    }
  }

  if (!raw.description || typeof raw.description !== 'string') return null

  // Energy: try 1008, then 2047, then 2048
  let energy: number | undefined
  for (const id of [1008, 2047, 2048]) {
    if (nutrients.has(id)) {
      energy = nutrients.get(id)!
      break
    }
  }
  const protein = nutrients.get(1003)
  const fat = nutrients.get(1004)
  const carbs = nutrients.get(1005)

  if (energy === undefined || protein === undefined || carbs === undefined || fat === undefined) return null

  // Brand: brandName first, then brandOwner, using titleCase only when no lowercase present
  const rec = raw as unknown as Record<string, unknown>
  const rawBrandName = typeof rec.brandName === 'string' ? rec.brandName : ''
  const rawBrandOwner = typeof raw.brandOwner === 'string' ? raw.brandOwner : ''
  let brand: string | null = null
  const trimmedBrandName = rawBrandName.trim()
  if (trimmedBrandName !== '') {
    brand = toTitle(trimmedBrandName)
  } else {
    const trimmedBrandOwner = rawBrandOwner.trim()
    if (trimmedBrandOwner !== '') {
      brand = toTitle(trimmedBrandOwner)
    }
  }

  // Barcode from gtinUpc for branded foods
  let barcode: string | null = null
  const rawGtin = typeof rec.gtinUpc === 'string' ? rec.gtinUpc : ''
  if (rawGtin.trim() !== '') {
    barcode = rawGtin.trim()
  }

  // Serving
  let servingG: number | null = null
  let servingLabel: string | null = null
  let unit: 'g' | 'ml' = 'g'

  if (typeof raw.servingSize === 'number' && typeof raw.servingSizeUnit === 'string') {
    const unitUpper = raw.servingSizeUnit.toUpperCase()
    if (unitUpper === 'ML' || unitUpper === 'MLT') {
      // liquid: 1 ml counts as 1 g in the math
      unit = 'ml'
      servingG = raw.servingSize
      const rawHsf = typeof rec.householdServingFullText === 'string' ? rec.householdServingFullText.trim() : ''
      servingLabel = rawHsf && !/^\d+(\.\d+)?\s*(ml|mlt)$/i.test(rawHsf)
        ? `${rawHsf} (${raw.servingSize} ml)`
        : `1 serving (${raw.servingSize} ml)`
    }
    if (unitUpper === 'G' || unitUpper === 'GRM') {
      servingG = raw.servingSize
      // Check if householdServingFullText is just a gram amount like "45 GRM" or "74 g"
      const rawHsf = typeof rec.householdServingFullText === 'string' ? rec.householdServingFullText : ''
      const hsf = rawHsf.trim()
      if (hsf && !/^\d+(\.\d+)?\s*(g|grm)$/i.test(hsf)) {
        servingLabel = `${hsf} (${raw.servingSize} g)`
      } else {
        servingLabel = `1 serving (${raw.servingSize} g)`
      }
    }
  }

  if (servingG === null && Array.isArray(raw.foodMeasures)) {
    const valid = raw.foodMeasures
      .filter((m) => typeof m.gramWeight === 'number' && m.gramWeight > 0)
      .sort((a, b) => a.rank - b.rank)
    if (valid.length > 0) {
      servingG = valid[0].gramWeight
      servingLabel = `${valid[0].disseminationText} (${servingG} g)`
    }
  }

  return {
    source: 'usda',
    sourceId: String(raw.fdcId),
    name: toTitle(raw.description) ?? raw.description,
    brand,
    servingG,
    servingLabel,
    unit,
    kcal100g: energy,
    protein100g: protein,
    carbs100g: carbs,
    fat100g: fat,
    fiber100g: nutrients.has(1079) ? (nutrients.get(1079) as number) : null,
    sugar100g: nutrients.has(2000) ? (nutrients.get(2000) as number) : null,
    sodiumMg100g: nutrients.has(1093) ? (nutrients.get(1093) as number) : null,
    barcode,
    extras100g: extrasFromUsda(nutrients),
  }
}

/** Check if a brand name matches a food's brand (case-insensitive, loose matching).
 * "kirkland" matches "Kirkland Signature" or "Kirkland" or "Signature Kirkland".
 */
export function matchesBrand(brand: string, foodBrand: string | null): boolean {
  if (!foodBrand) return false
  const brandLower = brand.toLowerCase().trim()
  const foodBrandLower = foodBrand.toLowerCase().trim()
  // Direct match or food brand starts with search brand
  if (foodBrandLower === brandLower) return true
  if (foodBrandLower.startsWith(brandLower + ' ')) return true
  // Search brand starts with food brand (e.g., "Kirkland" matches "Kirkland Signature")
  if (brandLower.startsWith(foodBrandLower + ' ')) return true
  // Check if any word in brand appears in food brand
  const brandWords = brandLower.split(/\s+/)
  const foodWords = foodBrandLower.split(/\s+/)
  return brandWords.some(bw => foodWords.includes(bw))
}

export async function searchUsda(
  query: string,
  { apiKey, fetchFn = fetch, signal, kind, brandOwner }: {
    apiKey: string
    fetchFn?: typeof fetch
    signal?: AbortSignal
    kind?: 'generic' | 'branded'
    brandOwner?: string
  },
): Promise<FoodResult[]> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`

  const dataType: string[] = kind === 'branded' ? ['Branded'] : ['Foundation', 'SR Legacy', 'Survey (FNDDS)']

  const body: Record<string, unknown> = {
    query,
    dataType,
    pageSize: 25,
  }
  if (brandOwner) {
    body.brandOwner = brandOwner
  }

  const res = await fetchFn(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`USDA search failed (HTTP ${res.status})`)
  }

  const data = await res.json() as unknown
  if (typeof data !== 'object' || data === null || !Array.isArray((data as Record<string, unknown>).foods)) return []

  const foods = (data as Record<string, unknown>).foods as readonly unknown[]
  return foods.map(normalizeUsdaFood).filter((r): r is FoodResult => r !== null)
}

// The packaged food whose barcode (gtinUpc) is exactly this code, or null. USDA only searches by text, so the code is searched as text and the results are checked.
export async function lookupUsdaBarcode(
  code: string,
  { apiKey, fetchFn = fetch, signal }: { apiKey: string; fetchFn?: typeof fetch; signal?: AbortSignal },
): Promise<FoodResult | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  signal?.addEventListener('abort', () => controller.abort())
  let res: Response
  try {
    res = await fetchFn('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: code, dataType: ['Branded'], pageSize: 25 }),
    })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error('USDA barcode lookup failed (HTTP ' + res.status + ')')
  const data = await res.json() as unknown
  if (typeof data !== 'object' || data === null || !Array.isArray((data as Record<string, unknown>).foods)) return null
  const want = code.replace(/^0+/, '')
  for (const raw of (data as Record<string, unknown>).foods as readonly unknown[]) {
    const gtin = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).gtinUpc : undefined
    if (typeof gtin === 'string' && gtin.trim().replace(/^0+/, '') === want) return normalizeUsdaFood(raw)
  }
  return null
}
