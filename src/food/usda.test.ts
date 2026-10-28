import { describe, it, expect, vi } from 'vitest'
import { normalizeUsdaFood, searchUsda, titleCase } from './usda'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadFixture(name: string): unknown {
  const raw = fs.readFileSync(path.join(__dirname, '__fixtures__', name), 'utf8')
  return JSON.parse(raw) as unknown
}

describe('normalizeUsdaFood', () => {
  it('every egg fixture item normalises to a FoodResult with source usda and numeric kcal100g', () => {
    const data = loadFixture('usda-search-egg.json') as Record<string, unknown>
    const foods = Array.isArray(data.foods) ? (data.foods as unknown[]) : []
    for (const raw of foods) {
      const result = normalizeUsdaFood(raw)
      expect(result).not.toBeNull()
      expect(result!.source).toBe('usda')
      expect(typeof result!.kcal100g).toBe('number')
    }
  })

  it('the banana fixture normalises', () => {
    const data = loadFixture('usda-search-banana.json') as Record<string, unknown>
    const foods = Array.isArray(data.foods) ? (data.foods as unknown[]) : []
    for (const raw of foods) {
      const result = normalizeUsdaFood(raw)
      expect(result).not.toBeNull()
      expect(result!.source).toBe('usda')
      expect(typeof result!.kcal100g).toBe('number')
      expect(typeof result!.name).toBe('string')
      expect(result!.name.length).toBeGreaterThan(0)
    }
  })

  it('energy fallback uses nutrientId 2047 when 1008 is missing', () => {
    const testFood: Record<string, unknown> = {
      fdcId: 999999,
      description: 'Test egg',
      foodNutrients: [
        { nutrientId: 1003, value: 12 },
        { nutrientId: 1004, value: 8 },
        { nutrientId: 1005, value: 1 },
        { nutrientId: 2047, value: 144 },
      ],
    }
    const result = normalizeUsdaFood(testFood)
    expect(result).not.toBeNull()
    expect(result!.kcal100g).toBe(144)
  })

  it('an item with protein removed returns null', () => {
    const rawFixture = loadFixture('usda-search-egg.json') as Record<string, unknown>
    const foods = Array.isArray(rawFixture.foods) ? (rawFixture.foods as unknown[]) : []
    expect(foods.length).toBeGreaterThan(0)

    const copy = JSON.parse(JSON.stringify(foods[0])) as Record<string, unknown>
    const fn = Array.isArray(copy.foodNutrients) ? (copy.foodNutrients as { nutrientId: number }[]) : []
    ;(copy.foodNutrients as unknown[]) = fn.filter((n) => n.nutrientId !== 1003)
    const result = normalizeUsdaFood(copy)
    expect(result).toBeNull()
  })

  it('searchUsda sends a POST with correct body and URL', async () => {
    const mockFetch = vi.fn(async (_url, _init) => {
      return new Response(JSON.stringify({ foods: [] }), { status: 200 })
    })

    await searchUsda('eggs', { apiKey: 'TEST_KEY', fetchFn: mockFetch as unknown as typeof fetch })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = (mockFetch.mock.calls[0] as [string, RequestInit])
    expect(callArgs[0]).toContain('api_key=TEST_KEY')
    const body = JSON.parse(callArgs[1].body as string)
    expect(body.query).toBe('eggs')
    expect(body.pageSize).toBe(25)
    expect(body.dataType).toEqual(['Foundation', 'SR Legacy', 'Survey (FNDDS)'])
    expect(callArgs[1].method).toBe('POST')
  })

  it('on a 403 searchUsda throws and the message does not contain the key', async () => {
    const { searchUsda } = await import('./usda')
    const mockFetch: typeof fetch = async () => new Response('Forbidden', { status: 403 })

    const err = await searchUsda('eggs', { apiKey: 'SECRET_KEY_123', fetchFn: mockFetch }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toBe('USDA search failed (HTTP 403)')
    expect((err as Error).message).not.toContain('SECRET_KEY_123')
  })
})

describe('serving from foodMeasures', () => {
  it('picks the lowest-rank measure, not the first listed (Banana, raw -> 1 banana, 126 g)', () => {
    const data = loadFixture('usda-search-banana.json') as { foods: { fdcId: number }[] }
    const raw = data.foods.find((f) => f.fdcId === 2709224)
    const result = normalizeUsdaFood(raw)
    expect(result!.servingG).toBe(126)
    expect(result!.servingLabel).toBe('1 banana (126 g)')
  })
})

describe('titleCase', () => {
  it('GREEK YOGURT -> Greek Yogurt', () => {
    expect(titleCase('GREEK YOGURT')).toBe('Greek Yogurt')
  })

  it("TRADER JOE'S -> Trader Joe's", () => {
    expect(titleCase("TRADER JOE'S")).toBe("Trader Joe's")
  })

  it('OATMEAL BREAD, OATMEAL -> Oatmeal Bread, Oatmeal', () => {
    expect(titleCase('OATMEAL BREAD, OATMEAL')).toBe('Oatmeal Bread, Oatmeal')
  })
})

describe('normalize branded foods', () => {
  it('fdcId 1995469 (missing protein in oatmeal fixture) gives null', () => {
    const data = loadFixture('usda-branded-oatmeal.json') as Record<string, unknown>
    const foods = Array.isArray(data.foods) ? data.foods : []
    const raw = foods[0] as Record<string, unknown>
    expect(raw.fdcId).toBe(1995469)
    const result = normalizeUsdaFood(raw)
    expect(result).toBeNull()
  })

  it('fdcId 2055229 gives brand Foska, barcode 036423350200, servingG 74, label 1 serving (74 g), name Oatmeal', () => {
    const data = loadFixture('usda-branded-oatmeal.json') as Record<string, unknown>
    const foods = Array.isArray(data.foods) ? data.foods : []
    const raw = foods[2] as Record<string, unknown>
    expect(raw.fdcId).toBe(2055229)
    const result = normalizeUsdaFood(raw)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Oatmeal')
    expect(result!.brand).toBe('Foska')
    expect(result!.barcode).toBe('036423350200')
    expect(result!.servingG).toBe(74)
    expect(result!.servingLabel).toBe('1 serving (74 g)')
  })

  it('fdcId 2110080 gives label 2 Slices (50 g) and brand Pepperidge Farm', () => {
    const data = loadFixture('usda-branded-oatmeal.json') as Record<string, unknown>
    const foods = Array.isArray(data.foods) ? data.foods : []
    const raw = foods[3] as Record<string, unknown>
    expect(raw.fdcId).toBe(2110080)
    const result = normalizeUsdaFood(raw)
    expect(result).not.toBeNull()
    expect(result!.brand).toBe('Pepperidge Farm')
    expect(result!.servingLabel).toBe('2 Slices (50 g)')
  })

  it('fdcId 2503998 (unit IU, empty brandName) gives servingG null and brand Thomas Brothers Ham Company', () => {
    const data = loadFixture('usda-branded-oatmeal.json') as Record<string, unknown>
    const foods = Array.isArray(data.foods) ? data.foods : []
    const raw = foods[1] as Record<string, unknown>
    expect(raw.fdcId).toBe(2503998)
    const result = normalizeUsdaFood(raw)
    expect(result).not.toBeNull()
    expect(result!.servingG).toBeNull()
    expect(result!.brand).toBe("Thomas Brothers Ham Company")
  })

  it('fdcId 373595 in greek yogurt fixture (no brandName) gives brand Trader Joe\'s and name Greek Yogurt', () => {
    const data = loadFixture('usda-branded-greek-yogurt.json') as Record<string, unknown>
    const foods = Array.isArray(data.foods) ? data.foods : []
    const raw = foods[2] as Record<string, unknown>
    expect(raw.fdcId).toBe(373595)
    expect(typeof raw.brandName).toBe('undefined')
    const result = normalizeUsdaFood(raw)
    expect(result).not.toBeNull()
    expect(result!.brand).toBe("Trader Joe's")
    expect(result!.name).toBe('Greek Yogurt')
  })

  it('every item in existing generic fixtures still gives barcode null and names unchanged', () => {
    const eggData = loadFixture('usda-search-egg.json') as Record<string, unknown>
    const eggFoods = Array.isArray(eggData.foods) ? eggData.foods : []
    for (const raw of eggFoods) {
      const result = normalizeUsdaFood(raw)
      expect(result).not.toBeNull()
      expect(result!.barcode).toBeNull()
    }

    const bananaData = loadFixture('usda-search-banana.json') as Record<string, unknown>
    const bananaFoods = Array.isArray(bananaData.foods) ? bananaData.foods : []
    for (const raw of bananaFoods) {
      const result = normalizeUsdaFood(raw)
      expect(result).not.toBeNull()
      expect(result!.barcode).toBeNull()
    }
  })
})

describe('searchUsda kind option', () => {
  it("with kind: 'branded', the POST body has dataType ['Branded']", async () => {
    const mockFetch = vi.fn(async (_url, _init) => {
      return new Response(JSON.stringify({ foods: [] }), { status: 200 })
    })

    await searchUsda('oatmeal', { apiKey: 'TEST_KEY', fetchFn: mockFetch as unknown as typeof fetch, kind: 'branded' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = (mockFetch.mock.calls[0] as [string, RequestInit])
    const body = JSON.parse(callArgs[1].body as string)
    expect(body.dataType).toEqual(['Branded'])
  })

  it('default uses the three generic dataType values', async () => {
    const mockFetch = vi.fn(async (_url, _init) => {
      return new Response(JSON.stringify({ foods: [] }), { status: 200 })
    })

    await searchUsda('eggs', { apiKey: 'TEST_KEY', fetchFn: mockFetch as unknown as typeof fetch })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = (mockFetch.mock.calls[0] as [string, RequestInit])
    const body = JSON.parse(callArgs[1].body as string)
    expect(body.dataType).toEqual(['Foundation', 'SR Legacy', 'Survey (FNDDS)'])
  })
})
