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

  it('searchFoods makes three fetches: USDA generic, USDA branded, and OFF', async () => {
    let capturedUrls: string[] = []
    const mockFetch = vi.fn(async (url) => {
      capturedUrls.push(String(url))
      return makeUsdaResponse([])
    }) as unknown as typeof fetch

    await searchFoods('oatmeal', { fetchFn: mockFetch })

    expect(capturedUrls.length).toBe(3)
    expect(capturedUrls[0]).toContain('api.nal.usda.gov')
    expect(capturedUrls[1]).toContain('api.nal.usda.gov')
    expect(capturedUrls[2]).toContain('functions/v1/off-search')
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

  it('makes two packaged-food searches: OFF and USDA branded', async () => {
    const { bodies, fetchFn } = capture([])
    await searchFoods('greek yogurt', { fetchFn, brand: 'Kirkland Signature' })
    // Two searches: OFF and USDA branded
    expect(bodies).toHaveLength(2)
    expect(bodies[0]).not.toHaveProperty('dataType') // OFF doesn't have dataType
    expect(bodies[1].dataType).toEqual(['Branded'])
    expect(bodies[1].query).toBe('+kirkland +signature greek yogurt')
    expect(bodies[1]).not.toHaveProperty('brandOwner')
  })

  it('keeps only foods of that brand', async () => {
    const { fetchFn } = capture([food(1, 'Greek Yogurt', 'Chobani'), food(2, 'Greek Yogurt', 'Fage'), food(3, 'Oikos Greek Yogurt', 'Oikos', 'Danone US, LLC')])
    const { results } = await searchFoods('greek yogurt', { fetchFn, brand: 'chobani' })
    expect(results.map((r) => r.brand)).toEqual(['Chobani'])
  })

  it('a brand alone lists that brand\'s foods', async () => {
    const { bodies, fetchFn } = capture([food(1, 'Ultra-Filtered Milk', 'fairlife')])
    const { results } = await searchFoods('', { fetchFn, brand: 'fairlife' })
    // OFF search sends q and brand in the body
    expect(bodies[0].q).toBe('fairlife')
    expect(bodies[0].brand).toBe('fairlife')
    expect(results).toHaveLength(1)
  })

  it('a failed brand search throws when both sources fail', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch
    await expect(searchFoods('milk', { fetchFn, brand: 'fairlife' })).rejects.toThrow('Packaged foods')
  })

  it('a 1-letter brand is ignored, so the search runs as usual', async () => {
    const { bodies, fetchFn } = capture([])
    await searchFoods('oatmeal', { fetchFn, brand: 'q' })
    // Now it runs as a normal search with 3 fetches
    expect(bodies).toHaveLength(3)
  })
})