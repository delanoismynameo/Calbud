import { describe, it, expect } from 'vitest'
import { normalizeOffProduct, lookupBarcode, offServingLabel } from './off'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadFixture(name: string): unknown {
  const raw = fs.readFileSync(path.join(__dirname, '__fixtures__', name), 'utf8')
  return JSON.parse(raw) as unknown
}

// Helper to check if the request URL includes images field
function getRequestFields(url: string): string[] {
  const match = url.match(/fields=([^&]+)/)
  return match ? match[1].split(',') : []
}

describe('normalizeOffProduct', () => {
  it('the brand is taken from a brands array first element ("Pepperidge Farm" from ["Pepperidge Farm", "Santa Cruz"])', () => {
    const data = loadFixture('off-search-oatmeal.json') as Record<string, unknown>
    const hits = Array.isArray(data.hits) ? (data.hits as unknown[]) : []
    // The 5th hit has brands: ["Pepperidge Farm", "Santa Cruz"]
    const food = hits[4]
    expect(food).toBeDefined()
    const result = normalizeOffProduct(food)
    expect(result!.brand).toBe('Pepperidge Farm')
  })

  it('a brands string ("Nutella, Ferrero") becomes just the first part', () => {
    const nutellaData = loadFixture('off-product-nutella.json') as Record<string, unknown>
    const productPart = (nutellaData.product as Record<string, unknown>) ?? nutellaData
    const result = normalizeOffProduct({ code: '3017620422003', ...productPart })
    expect(result!.brand).toBe('Nutella')
  })

  it('sodium is converted from g to mg (Nutella: 0.0428 g -> 42.8 mg)', () => {
    const nutellaData = loadFixture('off-product-nutella.json') as Record<string, unknown>
    const productPart = (nutellaData.product as Record<string, unknown>) ?? nutellaData
    const result = normalizeOffProduct({ code: '3017620422003', ...productPart })
    expect(result!.sodiumMg100g).toBeCloseTo(42.8)
  })

  it('the kJ fallback works on a hit with energy-kcal_100g removed', () => {
    const data = loadFixture('off-search-oatmeal.json') as Record<string, unknown>
    const hits = Array.isArray(data.hits) ? (data.hits as unknown[]) : []
    // The 2nd hit has both kcal and kJ
    const oatmealHit = hits[1]
    const copy: Record<string, unknown> = { ...(oatmealHit as Record<string, unknown>) }
    ;(copy.nutriments as Record<string, unknown>) = {
      carbohydrates_100g: 67.9,
      'energy-kj_100g': 1837.1,
      fat_100g: 7.14,
      fiber_100g: 10.7,
      proteins_100g: 14.3,
      salt_100g: 0.67,
      'saturated-fat_100g': 1.79,
      sodium_100g: 0.268,
      sugars_100g: 0,
    } as Record<string, unknown>

    const result = normalizeOffProduct(copy)
    expect(result).not.toBeNull()
    // 1837.1 / 4.184 ≈ 439.08 -> round to whole kcal -> 439
    expect(Math.round(result!.kcal100g as number)).toBe(439)
  })

  it('lookupBarcode on the Nutella fixture returns a result with barcode 3017620422003', async () => {
    const nutellaData = loadFixture('off-product-nutella.json') as Record<string, unknown>
    let capturedUrl: string | null = null
    const mockFetch: typeof fetch = (input) => {
      capturedUrl = String(input)
      expect(capturedUrl).toContain('3017620422003')
      return Promise.resolve(new Response(JSON.stringify(nutellaData), { status: 200 }))
    }
    const result = await lookupBarcode('3017620422003', { fetchFn: mockFetch as unknown as typeof fetch })
    expect(result).not.toBeNull()
    expect(result!.barcode).toBe('3017620422003')
  })

  it('lookupBarcode returns null when the not-found fixture is served with HTTP 404', async () => {
    const notFoundData = loadFixture('off-product-not-found.json') as Record<string, unknown>
    let capturedUrl: string | null = null
    const mockFetch: typeof fetch = (input) => {
      capturedUrl = String(input)
      return Promise.resolve(new Response(JSON.stringify(notFoundData), { status: 404 }))
    }
    const result = await lookupBarcode('00000000', { fetchFn: mockFetch as unknown as typeof fetch })
    expect(result).toBeNull()
    expect(capturedUrl).toContain('00000000')
  })

  it('throws on an HTTP 500 with a non-JSON body', async () => {
    const mockFetch: typeof fetch = (_input) => Promise.resolve(new Response('Internal Server Error', { status: 500 }))
    await expect(lookupBarcode('1234567890123', { fetchFn: mockFetch as unknown as typeof fetch })).rejects.toThrow(
      'Open Food Facts lookup failed (HTTP 500)',
    )
  })
})

describe('offServingLabel', () => {
  it('text that already has grams is returned unchanged ("0.75 cup (50 g)")', () => {
    expect(offServingLabel('0.75 cup (50 g)', 50)).toBe('0.75 cup (50 g)')
  })

  it('grams with no space are recognised ("30g")', () => {
    expect(offServingLabel('30g', 30)).toBe('30g')
  })

  it('uppercase G in parentheses returns trimmed text unchanged ("1 bar (40 G)")', () => {
    expect(offServingLabel('1 bar (40 G)', 40)).toBe('1 bar (40 G)')
  })

  it('2 cookies does not match grams and appends ("2 cookies")', () => {
    expect(offServingLabel('2 cookies', 28)).toBe('2 cookies (28 g)')
  })

  it('mg is not grams so appends ("1 tablet (250 mg)")', () => {
    expect(offServingLabel('1 tablet (250 mg)', 0.3)).toBe('1 tablet (250 mg) (0.3 g)')
  })

  it('empty string returns default label', () => {
    expect(offServingLabel('', 15)).toBe('1 serving (15 g)')
  })

  it('whitespace-only string returns default label', () => {
    expect(offServingLabel('   ', 15)).toBe('1 serving (15 g)')
  })

  it('trims and appends when no grams present ("  1 cup  ")', () => {
    expect(offServingLabel('  1 cup  ', 240)).toBe('1 cup (240 g)')
  })

  it('normalizeOffProduct uses offServingLabel correctly on a product with "0.75 cup (50 g)" serving_size', () => {
    const input = {
      product_name: 'Test cereal',
      serving_size: '0.75 cup (50 g)',
      serving_quantity: 50,
      nutriments: {
        'energy-kcal_100g': 380,
        proteins_100g: 8,
        carbohydrates_100g: 80,
        fat_100g: 3,
      },
    }
    const result = normalizeOffProduct({ code: '123', ...input })
    expect(result).not.toBeNull()
    expect(result!.servingLabel).toBe('0.75 cup (50 g)')
    expect(result!.servingG).toBe(50)
  })
})

describe('image URL extraction', () => {
  it('extracts image URL from Nutella fixture with front_fr image', () => {
    const nutellaData = loadFixture('off-product-nutella.json') as Record<string, unknown>
    const productPart = (nutellaData.product as Record<string, unknown>) ?? nutellaData
    const result = normalizeOffProduct({ code: '3017620422003', ...productPart })
    expect(result).not.toBeNull()
    // Barcode 3017620422003 -> folder 301/762/042/2003
    // front_fr.4.200.jpg
    expect(result!.imageUrl).toBe('https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.4.200.jpg')
  })

  it('returns null imageUrl when product has no images', () => {
    // Use a product that has all required nutriments but no images
    const input = {
      product_name: 'Test cereal',
      code: '1234567890123',
      serving_size: '0.75 cup (50 g)',
      serving_quantity: 50,
      nutriments: {
        'energy-kcal_100g': 380,
        proteins_100g: 8,
        carbohydrates_100g: 80,
        fat_100g: 3,
      },
    }
    const result = normalizeOffProduct(input)
    expect(result).not.toBeNull()
    expect(result!.imageUrl).toBeNull()
  })

  it('lookupBarcode requests images field in the API call', async () => {
    const nutellaData = loadFixture('off-product-nutella.json') as Record<string, unknown>
    let capturedUrl: string | null = null
    const mockFetch: typeof fetch = (input) => {
      capturedUrl = String(input)
      return Promise.resolve(new Response(JSON.stringify(nutellaData), { status: 200 }))
    }
    await lookupBarcode('3017620422003', { fetchFn: mockFetch as unknown as typeof fetch })
    expect(capturedUrl).not.toBeNull()
    const fields = getRequestFields(capturedUrl!)
    expect(fields).toContain('images')
  })
})

describe('image URL for short barcodes', () => {
  it('uses the plain code as the folder for an 8 digit barcode', () => {
    const result = normalizeOffProduct({
      product_name: 'Mint', code: '12345670',
      nutriments: { 'energy-kcal_100g': 10, proteins_100g: 0, carbohydrates_100g: 2, fat_100g: 0 },
      images: { front_en: { rev: '3', imgid: '1' } },
    })
    expect(result!.imageUrl).toBe('https://images.openfoodfacts.org/images/products/12345670/front_en.3.200.jpg')
  })
})
