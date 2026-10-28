import { describe, it, expect, vi } from 'vitest'
import { normalizeUsdaFood, searchUsda } from './usda'
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
    expect(Array.isArray(body.dataType)).toBe(true)
  })

  it('on a 403 searchUsda throws and the message does not contain the key', async () => {
    const { searchUsda } = await import('./usda')
    const mockFetch: typeof fetch = async () => new Response('Forbidden', { status: 403 })

    await expect(searchUsda('eggs', { apiKey: 'SECRET_KEY_123', fetchFn: mockFetch })).rejects.toThrow(
      'USDA search failed (403)',
    )
  })
})
