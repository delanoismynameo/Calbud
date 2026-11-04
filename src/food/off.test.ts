import { describe, it, expect, vi } from 'vitest'
import { normalizeOffProduct, lookupBarcode, offServingLabel, searchOff, offBrandTag } from './off'
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

describe('liquid detection', () => {
  it('detects liquid from serving_size with "330 ml"', () => {
    const result = normalizeOffProduct({
      code: 'cola-123',
      product_name: 'Cola',
      serving_size: '330 ml',
      serving_quantity: 330,
      product_quantity: 330,
      product_quantity_unit: 'ml',
      quantity: '330 ml',
      nutriments: { 'energy-kcal_100g': 42, proteins_100g: 0, carbohydrates_100g: 11, fat_100g: 0 },
    })
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('ml')
  })

  it('detects liquid from product_quantity_unit "l"', () => {
    const result = normalizeOffProduct({
      code: 'water-123',
      product_name: 'Water',
      serving_size: '1 l',
      serving_quantity: 1000,
      product_quantity: 1,
      product_quantity_unit: 'l',
      nutriments: { 'energy-kcal_100g': 0, proteins_100g: 0, carbohydrates_100g: 0, fat_100g: 0 },
    })
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('ml')
  })

  it('detects liquid from serving_size with "1 l"', () => {
    const result = normalizeOffProduct({
      code: 'juice-123',
      product_name: 'Juice',
      serving_size: '1 l',
      serving_quantity: 250,
      nutriments: { 'energy-kcal_100g': 50, proteins_100g: 0, carbohydrates_100g: 11, fat_100g: 0 },
    })
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('ml')
  })

  it('detects solid food (unit = "g") from serving_size without ml', () => {
    const result = normalizeOffProduct({
      code: 'crackers-123',
      product_name: 'Crackers',
      serving_size: '30 g',
      serving_quantity: 30,
      nutriments: { 'energy-kcal_100g': 450, proteins_100g: 8, carbohydrates_100g: 65, fat_100g: 15 },
    })
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('g')
  })

  it('sets unit to g for products without liquid indicators', () => {
    const result = normalizeOffProduct({
      code: 'cookies-123',
      product_name: 'Cookies',
      serving_size: '1 pack',
      serving_quantity: 50,
      nutriments: { 'energy-kcal_100g': 450, proteins_100g: 5, carbohydrates_100g: 60, fat_100g: 20 },
    })
    expect(result).not.toBeNull()
    expect(result!.unit).toBe('g')
  })
})

describe('offServingLabel with ml unit', () => {
  it('returns ml unit label when unit is ml and no serving_size', () => {
    expect(offServingLabel('', 330, 'ml')).toBe('1 serving (330 ml)')
  })

  it('returns ml unit label when serving_size already has ml', () => {
    expect(offServingLabel('330 ml', 330, 'ml')).toBe('330 ml')
  })

  it('appends ml unit when serving_size has different format', () => {
    expect(offServingLabel('1 can', 355, 'ml')).toBe('1 can (355 ml)')
  })

  it('still works with default g unit', () => {
    expect(offServingLabel('', 100)).toBe('1 serving (100 g)')
    expect(offServingLabel('1 cup', 240)).toBe('1 cup (240 g)')
  })
})

describe('liquid detection from the package quantity', () => {
  const nut = { 'energy-kcal_100g': 40, proteins_100g: 0, carbohydrates_100g: 10, fat_100g: 0 }
  it('is ml when only the quantity says ml', () => {
    const r = normalizeOffProduct({ product_name: 'Cola', code: '5449000000996', serving_size: '1 can', serving_quantity: 330, quantity: '330 ml', nutriments: nut })
    expect(r!.unit).toBe('ml')
  })
  it('asks for quantity and its unit from Open Food Facts', async () => {
    let url = ''
    const f: typeof fetch = (input) => { url = String(input); return Promise.resolve(new Response(JSON.stringify({ status: 0 }), { status: 200 })) }
    await lookupBarcode('5449000000996', { fetchFn: f })
    expect(url).toContain('quantity')
    expect(url).toContain('product_quantity_unit')
  })
})

describe('offBrandTag', () => {
  it('converts brand to lowercase with dashes between words', () => {
    expect(offBrandTag('Kirkland Signature')).toBe('kirkland-signature')
    expect(offBrandTag('Trader Joe\'s')).toBe('trader-joe-s')
    expect(offBrandTag('Great Value')).toBe('great-value')
  })

  it('handles punctuation and multiple spaces', () => {
    expect(offBrandTag('Kirkland  Signature')).toBe('kirkland-signature')
    expect(offBrandTag('Ben & Jerry\'s')).toBe('ben-jerry-s')
  })

  it('trims whitespace', () => {
    expect(offBrandTag('  Kirkland Signature  ')).toBe('kirkland-signature')
  })

  it('returns empty string for empty input', () => {
    expect(offBrandTag('')).toBe('')
    expect(offBrandTag('   ')).toBe('')
  })
})

describe('searchOff', () => {
  it('returns empty array for empty query', async () => {
    const mockFetch = vi.fn()
    const results = await searchOff('', { fetchFn: mockFetch })
    expect(results).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls the edge function with correct parameters', async () => {
    let capturedUrl: string | undefined
    let capturedBody: string | undefined
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedBody = init?.body as string
      const data = { hits: [], count: 0 }
      return new Response(JSON.stringify(data), { status: 200 })
    }) as unknown as typeof fetch

    await searchOff('oatmeal', { fetchFn: mockFetch })

    expect(capturedUrl).toContain('/functions/v1/off-search')
    expect(capturedBody).toContain('oatmeal')
  })

  it('includes brand parameter when provided', async () => {
    let capturedBody: string | undefined
    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = init?.body as string
      const data = { hits: [], count: 0 }
      return new Response(JSON.stringify(data), { status: 200 })
    }) as unknown as typeof fetch

    await searchOff('milk', { fetchFn: mockFetch, brand: 'Kirkland Signature' })

    expect(capturedBody).toContain('kirkland-signature')
  })

  it('normalizes OFF hits into FoodResults', async () => {
    const offHit = {
      code: '1234567890123',
      product_name: 'Test Food',
      brands: ['Test Brand'],
      nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5, carbohydrates_100g: 10, fat_100g: 2 },
    }
    const mockFetch = vi.fn(() => {
      const data = { hits: [offHit], count: 1 }
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }))
    }) as unknown as typeof fetch

    const results = await searchOff('test', { fetchFn: mockFetch })
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Test Food')
    expect(results[0].brand).toBe('Test Brand')
    expect(results[0].source).toBe('off')
  })

  it('throws error when fetch fails', async () => {
    const mockFetch = vi.fn(() => Promise.resolve(new Response('Error', { status: 500 })))
    await expect(searchOff('test', { fetchFn: mockFetch })).rejects.toThrow('Open Food Facts search failed')
  })

  it('handles empty hits array', async () => {
    const mockFetch = vi.fn(() => {
      const data = { hits: [], count: 0 }
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }))
    }) as unknown as typeof fetch

    const results = await searchOff('test', { fetchFn: mockFetch })
    expect(results).toEqual([])
  })
})
