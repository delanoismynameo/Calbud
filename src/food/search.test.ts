import { describe, it, expect, vi } from 'vitest'
import { searchFoods, usdaApiKey } from './search'

function makeUsdaResponse(foods: unknown[]) {
  return new Response(JSON.stringify({ foods }), { status: 200 })
}

function makeOffResponse(hits: unknown[]) {
  return new Response(JSON.stringify({ hits, count: hits.length }), { status: 200 })
}

describe('searchFoods', () => {
  it('a 1-character query makes no fetch', async () => {
    const mockFetch = vi.fn(async () => new Response('', { status: 200 }))
    const result = await searchFoods('x', { fetchFn: mockFetch as unknown as typeof fetch })
    expect(result.results).toEqual([])
    expect(result.errors).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('with a sign-in token it also asks Open Food Facts; without one, only USDA', async () => {
    const urls: string[] = []
    const fetchFn: typeof fetch = (url) => { urls.push(String(url)); return Promise.resolve(makeUsdaResponse([])) }
    await searchFoods('oatmeal', { fetchFn })
    expect(urls).toHaveLength(2)
    expect(urls.every((u) => u.includes('api.nal.usda.gov'))).toBe(true)
    urls.length = 0
    await searchFoods('oatmeal', { fetchFn, offToken: 'tok' })
    expect(urls).toHaveLength(3)
    expect(urls.filter((u) => u.includes('/functions/v1/off-search'))).toHaveLength(1)
  })

  it('Open Food Facts results join USDA ones; when it fails, USDA still shows with a note', async () => {
    const usda = { fdcId: 1, description: 'Oatmeal Cookie', brandName: 'Tops', gtinUpc: '1', foodNutrients: [{ nutrientId: 1008, value: 450 }, { nutrientId: 1003, value: 5 }, { nutrientId: 1004, value: 20 }, { nutrientId: 1005, value: 60 }] }
    const hit = { code: '2', product_name: 'Oatmeal Squares', brands: ['Quaker'], nutriments: { 'energy-kcal_100g': 380, proteins_100g: 10, carbohydrates_100g: 80, fat_100g: 5 } }
    const routed = (offOk: boolean): typeof fetch => (url) => Promise.resolve(
      String(url).includes('off-search') ? (offOk ? makeOffResponse([hit]) : new Response('', { status: 502 })) : makeUsdaResponse([usda]))
    const both = await searchFoods('oatmeal', { fetchFn: routed(true), offToken: 'tok' })
    expect(both.results.map((r) => r.source).sort()).toEqual(['off', 'usda'])
    expect(both.errors).toEqual([])
    const usdaOnly = await searchFoods('oatmeal', { fetchFn: routed(false), offToken: 'tok' })
    expect(usdaOnly.results.map((r) => r.source)).toEqual(['usda'])
    expect(usdaOnly.errors).toEqual(['Open Food Facts: search failed (HTTP 502)'])
  })

  it('USDA packaged foods and Open Food Facts take turns, so equal matches from both make the 30', async () => {
    const nutrients = [{ nutrientId: 1008, value: 100 }, { nutrientId: 1003, value: 5 }, { nutrientId: 1004, value: 1 }, { nutrientId: 1005, value: 10 }]
    const branded = Array.from({ length: 40 }, (_, i) => ({ fdcId: 100 + i, description: `Greek Yogurt ${i}`, brandName: 'Chobani', gtinUpc: String(100 + i), foodNutrients: nutrients }))
    const hits = Array.from({ length: 20 }, (_, i) => ({ code: String(900 + i), product_name: `Greek Yogurt Cup ${i}`, brands: ['Chobani'], nutriments: { 'energy-kcal_100g': 90, proteins_100g: 9, carbohydrates_100g: 5, fat_100g: 2 } }))
    const fetchFn: typeof fetch = (url, init) => Promise.resolve(
      String(url).includes('off-search') ? makeOffResponse(hits)
        : makeUsdaResponse(String(init?.body).includes('Branded') ? branded : []))
    const { results } = await searchFoods('chobani greek yogurt', { fetchFn, offToken: 'tok' })
    expect(results).toHaveLength(30)
    expect(results.slice(0, 4).map((r) => r.source)).toEqual(['usda', 'off', 'usda', 'off'])
    expect(results.filter((r) => r.source === 'off')).toHaveLength(15)
  })

  it('generic results come before branded ones', async () => {
    const usdaGenericFood = {
      fdcId: 10001,
      description: 'Generic Food',
      foodNutrients: [
        { nutrientId: 1008, value: 100 },
        { nutrientId: 1003, value: 5 },
        { nutrientId: 1004, value: 2 },
        { nutrientId: 1005, value: 20 },
      ],
    }

    const usdaBrandedFood = {
      fdcId: 20001,
      description: 'Branded Food',
      brandOwner: 'Test Co',
      foodNutrients: [
        { nutrientId: 1008, value: 110 },
        { nutrientId: 1003, value: 6 },
        { nutrientId: 1004, value: 3 },
        { nutrientId: 1005, value: 22 },
      ],
    }

    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      const isGeneric = body.dataType?.includes('Foundation') || body.dataType?.includes('SR Legacy')
      const isBranded = body.dataType?.includes('Branded')
      if (isGeneric) return makeUsdaResponse([usdaGenericFood])
      if (isBranded) return makeUsdaResponse([usdaBrandedFood])
      return makeOffResponse([])
    }) as unknown as typeof fetch

    const results = await searchFoods('food', { fetchFn: mockFetch })

    expect(results.results.length).toBe(2)
    expect(results.results[0].name).toBe('Generic Food')
    expect(results.results[1].name).toBe('Branded Food')
  })

  it('a generic failure gives one Basic foods error and still returns branded results', async () => {
    const usdaBrandedFood = {
      fdcId: 20001,
      description: 'Branded Food',
      brandOwner: 'Test Co',
      foodNutrients: [
        { nutrientId: 1008, value: 110 },
        { nutrientId: 1003, value: 6 },
        { nutrientId: 1004, value: 3 },
        { nutrientId: 1005, value: 22 },
      ],
    }

    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      const isGeneric = body.dataType?.includes('Foundation') || body.dataType?.includes('SR Legacy')
      const isBranded = body.dataType?.includes('Branded')
      if (isGeneric) return new Response('Server Error', { status: 500 })
      if (isBranded) return makeUsdaResponse([usdaBrandedFood])
      return makeOffResponse([])
    }) as unknown as typeof fetch

    const results = await searchFoods('oatmeal', { fetchFn: mockFetch })

    expect(results.results.length).toBe(1)
    expect(results.errors.length).toBe(1)
    expect(results.errors[0]).toContain('Basic foods:')
  })

  it('a branded failure gives one Packaged foods error and still returns generic results', async () => {
    const usdaGenericFood = {
      fdcId: 10001,
      description: 'Generic Food',
      foodNutrients: [
        { nutrientId: 1008, value: 100 },
        { nutrientId: 1003, value: 5 },
        { nutrientId: 1004, value: 2 },
        { nutrientId: 1005, value: 20 },
      ],
    }

    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      const isGeneric = body.dataType?.includes('Foundation') || body.dataType?.includes('SR Legacy')
      if (isGeneric) return makeUsdaResponse([usdaGenericFood])
      return new Response('Server Error', { status: 500 })
    }) as unknown as typeof fetch

    const results = await searchFoods('oatmeal', { fetchFn: mockFetch })

    expect(results.results.length).toBe(1)
    expect(typeof results.errors[0]).toBe('string')
    expect(results.errors[0]).toContain('Packaged foods:')
  })

  it('both failing throws', async () => {
    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Response('Server Error', { status: 500 })
    }) as unknown as typeof fetch

    await expect(searchFoods('oatmeal', { fetchFn: mockFetch })).rejects.toThrow('Basic foods:')
  })

  it('results are capped at 30', async () => {
    const usdaFoods = Array.from({ length: 20 }, (_, i) => ({
      fdcId: 1000 + i,
      description: 'Food ' + String(i),
      foodNutrients: [
        { nutrientId: 1008, value: 100 + i },
        { nutrientId: 1003, value: i + 1 },
        { nutrientId: 1004, value: i * 0.1 },
        { nutrientId: 1005, value: i * 2 },
      ],
    }))

    const brandedFoods = Array.from({ length: 20 }, (_, i) => ({
      fdcId: 2000 + i,
      description: 'Branded Food ' + String(i),
      foodNutrients: [
        { nutrientId: 1008, value: 100 + i },
        { nutrientId: 1003, value: i + 1 },
        { nutrientId: 1004, value: i * 0.1 },
        { nutrientId: 1005, value: i * 2 },
      ],
    }))

    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      const isGeneric = body.dataType?.includes('Foundation') || body.dataType?.includes('SR Legacy')
      const isBranded = body.dataType?.includes('Branded')
      if (isGeneric) return makeUsdaResponse(usdaFoods)
      if (isBranded) return makeUsdaResponse(brandedFoods)
      return makeOffResponse([])
    }) as unknown as typeof fetch

    const results = await searchFoods('food', { fetchFn: mockFetch })
    expect(results.results.length).toBe(30)
  })

  it('duplicates are removed', async () => {
    const usdaGenericFood = {
      fdcId: 10001,
      description: 'Milk',
      brandOwner: 'Dairy Co',
      foodNutrients: [
        { nutrientId: 1008, value: 42 },
        { nutrientId: 1003, value: 3.4 },
        { nutrientId: 1004, value: 1.0 },
        { nutrientId: 1005, value: 5.0 },
      ],
    }

    const usdaBrandedFood = {
      fdcId: 20001,
      description: 'MILK',
      brandName: 'DAIRY CO',
      foodNutrients: [
        { nutrientId: 1008, value: 42 },
        { nutrientId: 1003, value: 3.4 },
        { nutrientId: 1004, value: 1.0 },
        { nutrientId: 1005, value: 5.0 },
      ],
    }

    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      const isGeneric = body.dataType?.includes('Foundation') || body.dataType?.includes('SR Legacy')
      const isBranded = body.dataType?.includes('Branded')
      if (isGeneric) return makeUsdaResponse([usdaGenericFood])
      if (isBranded) return makeUsdaResponse([usdaBrandedFood])
      return makeOffResponse([])
    }) as unknown as typeof fetch

    const results = await searchFoods('milk', { fetchFn: mockFetch })
    expect(results.results.length).toBe(1)
  })

  it("the generic search drops the cooking word; the branded one keeps it", async () => {
    const usdaGenericFood = {
      fdcId: 10001,
      description: 'Vegetables',
      foodNutrients: [
        { nutrientId: 1008, value: 100 },
        { nutrientId: 1003, value: 5 },
        { nutrientId: 1004, value: 2 },
        { nutrientId: 1005, value: 20 },
      ],
    }

    const usdaBrandedFood = {
      fdcId: 20001,
      description: 'Steamed Vegetables',
      brandOwner: 'Test Co',
      foodNutrients: [
        { nutrientId: 1008, value: 110 },
        { nutrientId: 1003, value: 6 },
        { nutrientId: 1004, value: 3 },
        { nutrientId: 1005, value: 22 },
      ],
    }

    const capturedQueries: string[] = []
    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.body) {
        const body = JSON.parse(String(init.body))
        capturedQueries.push(body.query)
      }
      const isGeneric = init && (init.body ? JSON.parse(String(init.body)).dataType?.includes('Foundation') : false)
      // Check body differently since init comes in as a property
      const body = init?.body ? JSON.parse(String(init.body)) : null
      const isGenericQuery = body?.dataType?.includes('Foundation') || body?.dataType?.includes('SR Legacy')
      const isBrandedQuery = body?.dataType?.includes('Branded')
      if (isGenericQuery) return makeUsdaResponse([usdaGenericFood])
      if (isBrandedQuery) return makeUsdaResponse([usdaBrandedFood])
      return makeOffResponse([])
    }) as unknown as typeof fetch

    await searchFoods('Steamed vegetables', { fetchFn: mockFetch })

    expect(capturedQueries[0]).toBe('vegetables')
    expect(capturedQueries[1]).toBe('Steamed vegetables')
  })

  it("results are ranked by match across both sources", async () => {
    const usdaGenericFood = {
      fdcId: 10001,
      description: 'Babyfood, vegetables, mix vegetables junior',
      foodNutrients: [
        { nutrientId: 1008, value: 100 },
        { nutrientId: 1003, value: 5 },
        { nutrientId: 1004, value: 2 },
        { nutrientId: 1005, value: 20 },
      ],
    }

    const usdaGenericFood2 = {
      fdcId: 10002,
      description: 'Classic mixed vegetables, cooked',
      foodNutrients: [
        { nutrientId: 1008, value: 95 },
        { nutrientId: 1003, value: 4 },
        { nutrientId: 1004, value: 3 },
        { nutrientId: 1005, value: 15 },
      ],
    }

    const usdaBrandedFood = {
      fdcId: 20001,
      description: 'Steamed Mixed Vegetables',
      brandOwner: 'Test Co',
      foodNutrients: [
        { nutrientId: 1008, value: 80 },
        { nutrientId: 1003, value: 3 },
        { nutrientId: 1004, value: 2 },
        { nutrientId: 1005, value: 10 },
      ],
    }

    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      const isGeneric = body?.dataType?.includes('Foundation') || body?.dataType?.includes('SR Legacy')
      const isBranded = body?.dataType?.includes('Branded')
      if (isGeneric) return makeUsdaResponse([usdaGenericFood, usdaGenericFood2])
      if (isBranded) return makeUsdaResponse([usdaBrandedFood])
      return makeOffResponse([])
    }) as unknown as typeof fetch

    const results = await searchFoods('steamed vegetables', { fetchFn: mockFetch })

    expect(results.results[0].name).toBe('Steamed Mixed Vegetables')
    expect(results.results[1].name).toBe('Classic mixed vegetables, cooked')
    expect(results.results[2].name).toBe('Babyfood, vegetables, mix vegetables junior')
  })
})

describe('usdaApiKey', () => {
  it('returns the env var when non-empty or default', () => {
    const key = usdaApiKey()
    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThan(0)
  })
})

describe('searchFoods with a brand', () => {
  const food = (fdcId: number, description: string, brandName: string, brandOwner = '') => ({
    fdcId, description, brandName, brandOwner, gtinUpc: String(fdcId),
    foodNutrients: [{ nutrientId: 1008, value: 100 }, { nutrientId: 1003, value: 10 }, { nutrientId: 1004, value: 1 }, { nutrientId: 1005, value: 5 }],
  })

  function capture(foods: unknown[]) {
    const bodies: Record<string, unknown>[] = []
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.body) {
        bodies.push(JSON.parse(String(init?.body)))
      }
      return makeUsdaResponse(foods)
    }) as unknown as typeof fetch
    return { bodies, fetchFn }
  }

  it('makes one USDA packaged-food search, plus Open Food Facts with a token', async () => {
    const { bodies, fetchFn } = capture([])
    await searchFoods('greek yogurt', { fetchFn, brand: 'Kirkland Signature' })
    expect(bodies).toHaveLength(1)
    expect(bodies[0].dataType).toEqual(['Branded'])
    expect(bodies[0].query).toBe('+kirkland +signature greek yogurt')
    expect(bodies[0]).not.toHaveProperty('brandOwner')
    bodies.length = 0
    await searchFoods('greek yogurt', { fetchFn, brand: 'Kirkland Signature', offToken: 'tok' })
    expect(bodies).toContainEqual({ q: 'greek yogurt', brand: 'Kirkland Signature' })
  })

  it('keeps only foods of that brand', async () => {
    const { fetchFn } = capture([food(1, 'Greek Yogurt', 'Chobani'), food(2, 'Greek Yogurt', 'Fage'), food(3, 'Oikos Greek Yogurt', 'Oikos', 'Danone US, LLC')])
    const { results } = await searchFoods('greek yogurt', { fetchFn, brand: 'chobani' })
    expect(results.map((r) => r.brand)).toEqual(['Chobani'])
  })

  it('a brand alone lists that brand\'s foods', async () => {
    const { bodies, fetchFn } = capture([food(1, 'Ultra-Filtered Milk', 'fairlife')])
    const { results } = await searchFoods('', { fetchFn, brand: 'fairlife', offToken: 'tok' })
    expect(bodies).toContainEqual({ q: '', brand: 'fairlife' })
    expect(results.map((r) => r.name)).toEqual(['Ultra-Filtered Milk'])
  })

  it('a failed brand search throws when both sources fail', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch
    await expect(searchFoods('milk', { fetchFn, brand: 'fairlife' })).rejects.toThrow('Packaged foods')
  })

  it('a 1-letter brand is ignored, so the search runs as usual', async () => {
    const { bodies, fetchFn } = capture([])
    await searchFoods('oatmeal', { fetchFn, brand: 'q' })
    expect(bodies).toHaveLength(2)
  })
})