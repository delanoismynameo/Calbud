import { describe, it, expect } from 'vitest'
import { parseCustomFood } from './customFood'

const base = (o = {}) => ({ name: 'Sunday chili', servingLabel: '1 bowl', servingG: '350', kcal: '420', protein: '28', carbs: '35', fat: '14', ...o })

describe('parseCustomFood', () => {
  it('valid input returns ok:true with correct food', () => {
    const result = parseCustomFood(base(), 'id-1')
    expect(result).toEqual({
      ok: true,
      food: {
        source: 'custom',
        sourceId: 'id-1',
        name: 'Sunday chili',
        brand: null,
        servingG: 350,
        servingLabel: '1 bowl',
        kcal100g: 120,
        protein100g: 8,
        carbs100g: 10,
        fat100g: 4,
        fiber100g: null,
        sugar100g: null,
        sodiumMg100g: null,
        barcode: null,
      },
    })
  })

  it('blank protein, carbs, fat become 0', () => {
    const result = parseCustomFood(base({ protein: '', carbs: '', fat: '' }), 'id-1')
    expect(result).toEqual({
      ok: true,
      food: {
        source: 'custom',
        sourceId: 'id-1',
        name: 'Sunday chili',
        brand: null,
        servingG: 350,
        servingLabel: '1 bowl',
        kcal100g: 120,
        protein100g: 0,
        carbs100g: 0,
        fat100g: 0,
        fiber100g: null,
        sugar100g: null,
        sodiumMg100g: null,
        barcode: null,
      },
    })
  })

  it('comma decimal works', () => {
    const result = parseCustomFood(base({ servingG: '100', kcal: '12,5' }), 'id-1')
    expect(result).toEqual({
      ok: true,
      food: {
        source: 'custom',
        sourceId: 'id-1',
        name: 'Sunday chili',
        brand: null,
        servingG: 100,
        servingLabel: '1 bowl',
        kcal100g: 12.5,
        protein100g: 28,
        carbs100g: 35,
        fat100g: 14,
        fiber100g: null,
        sugar100g: null,
        sodiumMg100g: null,
        barcode: null,
      },
    })
  })

  it('blank name and whitespace-only name both error', () => {
    expect(parseCustomFood(base({ name: '' }), 'id-1')).toEqual({ ok: false, errors: { name: 'Enter a name.' } })
    expect(parseCustomFood(base({ name: '   ' }), 'id-1')).toEqual({ ok: false, errors: { name: 'Enter a name.' } })
  })

  it('bad servingG values each error', () => {
    expect(parseCustomFood(base({ servingG: '' }), 'id-1')).toEqual({ ok: false, errors: { servingG: 'Enter the serving weight in grams (1–2000).' } })
    expect(parseCustomFood(base({ servingG: '0' }), 'id-1')).toEqual({ ok: false, errors: { servingG: 'Enter the serving weight in grams (1–2000).' } })
    expect(parseCustomFood(base({ servingG: '2001' }), 'id-1')).toEqual({ ok: false, errors: { servingG: 'Enter the serving weight in grams (1–2000).' } })
    expect(parseCustomFood(base({ servingG: 'abc' }), 'id-1')).toEqual({ ok: false, errors: { servingG: 'Enter the serving weight in grams (1–2000).' } })
  })

  it('bad kcal values each error', () => {
    expect(parseCustomFood(base({ kcal: '-1' }), 'id-1')).toEqual({ ok: false, errors: { kcal: 'Enter calories (0–5000).' } })
    expect(parseCustomFood(base({ kcal: '5001' }), 'id-1')).toEqual({ ok: false, errors: { kcal: 'Enter calories (0–5000).' } })
  })

  it('blank servingLabel becomes 1 serving', () => {
    const result = parseCustomFood(base({ servingLabel: '' }), 'id-1')
    expect(result).toEqual({
      ok: true,
      food: {
        source: 'custom',
        sourceId: 'id-1',
        name: 'Sunday chili',
        brand: null,
        servingG: 350,
        servingLabel: '1 serving',
        kcal100g: 120,
        protein100g: 8,
        carbs100g: 10,
        fat100g: 4,
        fiber100g: null,
        sugar100g: null,
        sodiumMg100g: null,
        barcode: null,
      },
    })
  })

  it('empty name together with bad kcal gives both errors', () => {
    const result = parseCustomFood(base({ name: '', kcal: 'x' }), 'id-1')
    expect(result).toEqual({
      ok: false,
      errors: { name: 'Enter a name.', kcal: 'Enter calories (0–5000).' },
    })
  })
})
