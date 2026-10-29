import { describe, it, expect } from 'vitest'
import type { LabelKey, LabelRow } from './label'
import { previewLabel } from './labelPreview'

function row(rows: LabelRow[], key: LabelKey) {
  return rows.find(r => r.key === key)!
}

describe('previewLabel', () => {
  const base = { servingLabel: '1 bowl', servingG: '150', kcal: '250', protein: '10', carbs: '27,5', fat: '39' }

  it('full preview with sodium and empty fiber', () => {
    const result = previewLabel(base, { sodium_mg: '460', fiber_g: '' })!
    expect(result.kcal).toBe(250)
    expect(result.servingText).toBe('1 bowl (150 g)')

    const r = row(result.rows, 'fat')
    expect(r.amount).toBe('39 g')
    expect(r.dv).toBe(50)
    expect(row(result.rows, 'carbs').amount).toBe('28 g')
    expect(row(result.rows, 'sodium_mg').amount).toBe('460 mg')
    expect(row(result.rows, 'fiber_g').amount).toBe(null)
  })

  it('kcal: empty, abc, negative all give null', () => {
    expect(previewLabel({ ...base, kcal: '' }, {})).toBe(null)
    expect(previewLabel({ ...base, kcal: 'abc' }, {})).toBe(null)
    expect(previewLabel({ ...base, kcal: '-5' }, {})).toBe(null)
  })

  it('non-usable protein and fat default to 0', () => {
    const r1 = previewLabel({ ...base, protein: '' }, {})!
    expect(row(r1.rows, 'protein').amount).toBe('0 g')

    const r2 = previewLabel({ ...base, fat: 'x' }, {})!
    expect(row(r2.rows, 'fat').amount).toBe('0 g')
  })

  it('servingText for various labels and grams', () => {
    let r = previewLabel({ servingLabel: '', servingG: '', kcal: '100', protein: '5', carbs: '10', fat: '2' }, {})!
    expect(r.servingText).toBe('1 serving')

    r = previewLabel({ servingLabel: '  ', servingG: '30', kcal: '100', protein: '5', carbs: '10', fat: '2' }, {})!
    expect(r.servingText).toBe('1 serving (30 g)')

    r = previewLabel({ servingLabel: '1 bowl', servingG: '0', kcal: '100', protein: '5', carbs: '10', fat: '2' }, {})!
    expect(r.servingText).toBe('1 bowl')
  })

  it('extras with invalid values are left out', () => {
    const r = previewLabel(base, { iron_mg: '-1', calcium_mg: 'abc', potassium_mg: ' 300 ' })!
    expect(row(r.rows, 'iron_mg').amount).toBe(null)
    expect(row(r.rows, 'calcium_mg').amount).toBe(null)
    expect(row(r.rows, 'potassium_mg').amount).toBe('300 mg')
  })

  it('kcal rounding', () => {
    const r = previewLabel({ ...base, kcal: '99.6' }, {})!
    expect(r.kcal).toBe(100)
  })
})
