import { describe, it, expect } from 'vitest'
import type { ExtraKey, Extras } from './extras'
import { EXTRAS, extrasFromUsda, extrasFromOff, cleanExtras, scaleExtras, sumExtras, dvPercent, parseExtraInputs, extrasPerServing } from './extras'

describe('EXTRAS', () => {
  it('has 11 entries, all different keys, first is sat_fat_g, sodium dv is 2300', () => {
    expect(EXTRAS).toHaveLength(11)
    const keys = EXTRAS.map((e) => e.key)
    expect(new Set(keys).size).toBe(11)
    expect(keys[0]).toBe('sat_fat_g')
    expect(EXTRAS.find(e => e.key === 'sodium_mg')!.dv).toBe(2300)
  })
})

describe('extrasFromUsda', () => {
  it('extracts known extras and rounds to 2 decimals', () => {
    const result = extrasFromUsda(new Map([
      [1093, 3], [1258, 0.698], [1114, 0], [1110, 0], [1087, 22], [1003, 3.89],
    ]))
    expect(result).toEqual({ sodium_mg: 3, sat_fat_g: 0.7, vit_d_mcg: 0, calcium_mg: 22 } as Extras)
  })
})

describe('extrasFromOff', () => {
  it('extracts known extras and handles string/number/scale correctly', () => {
    const result = extrasFromOff({
      'sodium_100g': 0.0428,
      'sugars_100g': 56.3,
      'added-sugars_100g': 52.13,
      'fiber_100g': 0,
      'salt_100g': 0.107,
      'iron_100g': '0.0012',
      'calcium_100g': 'abc',
    })
    expect(result).toEqual({ sodium_mg: 42.8, sugar_g: 56.3, added_sugar_g: 52.13, fiber_g: 0, iron_mg: 1.2 } as Extras)
  })

  it('accepts number or string for value, rejects negative', () => {
    const result = extrasFromOff({
      'vitamin-d_100g': 0.0000025,
      'cholesterol_100g': -1,
    })
    expect(result).toEqual({ vit_d_mcg: 2.5 } as Extras)
  })
})

describe('cleanExtras', () => {
  it('keeps only known keys with finite number >= 0, rejects bad input', () => {
    expect(cleanExtras({ sodium_mg: 120, foo: 3, iron_mg: -1, fiber_g: 'x', sugar_g: 0 }))
      .toEqual({ sodium_mg: 120, sugar_g: 0 } as Extras)
    expect(cleanExtras(null)).toEqual({})
    expect(cleanExtras([1])).toEqual({})
    expect(cleanExtras(undefined)).toEqual({})
  })
})

describe('scaleExtras', () => {
  it('scales by grams / 100 and rounds to 1 decimal, empty stays empty', () => {
    const result = scaleExtras({ sodium_mg: 49, iron_mg: 0.9 }, 240)
    expect(result).toEqual({ sodium_mg: 117.6, iron_mg: 2.2 } as Extras)
    expect(scaleExtras({}, 100)).toEqual({})
  })
})

describe('sumExtras', () => {
  it('produces one row per extra in order with total and missing counts', () => {
    const r = sumExtras([{ sodium_mg: 117.6, fiber_g: 4.1 }, {}, { sodium_mg: 30 }])
    expect(r).toHaveLength(11)
    expect(r[0].info.key).toBe('sat_fat_g')

    const sodiumItem = r.find(e => e.info.key === 'sodium_mg')!
    expect(sodiumItem.total).toBe(147.6)
    expect(sodiumItem.missing).toBe(1)

    const fiberItem = r.find(e => e.info.key === 'fiber_g')!
    expect(fiberItem.total).toBe(4.1)
    expect(fiberItem.missing).toBe(2)

    const ironItem = r.find(e => e.info.key === 'iron_mg')!
    expect(ironItem.total).toBe(0)
    expect(ironItem.missing).toBe(3)
  })
})

describe('dvPercent', () => {
  it('returns percentage when dv is set, null when dv is null or total is 0', () => {
    expect(dvPercent(1150, 2300)).toBe(50)
    expect(dvPercent(5, null)).toBeNull()
    expect(dvPercent(0, 20)).toBe(0)
  })
})

describe('parseExtraInputs', () => {
  it('converts inputs to per-100g, handles blank and trim', () => {
    expect(parseExtraInputs({ sodium_mg: '700', fiber_g: ' 3.5 ', iron_mg: '' }, 350))
      .toEqual({ ok: true, extras100g: { sodium_mg: 200, fiber_g: 1 } as Extras })
  })

  it('returns errors for non-finite and out-of-range values', () => {
    expect(parseExtraInputs({ sodium_mg: 'abc', sat_fat_g: '-1' }, 100))
      .toEqual({ ok: false, errors: { sodium_mg: 'Enter a number (or leave it blank).', sat_fat_g: 'Enter a number (or leave it blank).' } })
  })

  it('handles comma as decimal and empty inputs', () => {
    expect(parseExtraInputs({ calcium_mg: '1,5' }, 100)).toEqual({ ok: true, extras100g: { calcium_mg: 1.5 } as Extras })
    expect(parseExtraInputs({}, 100)).toEqual({ ok: true, extras100g: {} as Extras })
  })
})

describe('extrasPerServing', () => {
  it('converts per-100g to per-serving and empty stays empty', () => {
    expect(extrasPerServing({ sodium_mg: 200, fiber_g: 1 }, 350))
      .toEqual({ sodium_mg: '700', fiber_g: '3.5' })
    expect(extrasPerServing({}, 100)).toEqual({})
  })
})
