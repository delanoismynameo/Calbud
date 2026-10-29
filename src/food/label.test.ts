import { describe, it, expect } from 'vitest'
import type { LabelKey } from './label'
import { formatAmount, labelRows, servingLine } from './label'

const input = { fat_g: 39, carbs_g: 27.5, protein_g: 10, extras: { sat_fat_g: 5, sodium_mg: 460, fiber_g: 2.8, vit_d_mcg: 2 } }
function row(key: LabelKey) { return labelRows(input).find(r => r.key === key)! }

describe('formatAmount', () => {
  it('rounds under-10 to one decimal without trailing .0, and >=10 to whole number', () => {
    expect(formatAmount(4.96, 'g')).toBe('5 g')
    expect(formatAmount(0.46, 'g')).toBe('0.5 g')
    expect(formatAmount(12.4, 'g')).toBe('12 g')
    expect(formatAmount(0, 'mg')).toBe('0 mg')
    expect(formatAmount(460, 'mg')).toBe('460 mg')
    expect(formatAmount(2.24, '\u00b5g')).toBe('2.2 \u00b5g')
  })
})

describe('labelRows', () => {
  it('has 14 rows with keys in table order', () => {
    const r = labelRows(input)
    expect(r).toHaveLength(14)
    const keys = r.map(x => x.key as string)
    const expected = ['fat','sat_fat_g','trans_fat_g','cholesterol_mg','sodium_mg','carbs',
      'fiber_g','sugar_g','added_sugar_g','protein','vit_d_mcg','calcium_mg','iron_mg','potassium_mg']
    expect(keys).toEqual(expected)
  })

  it('Total Fat: amount 39 g, dv 50, indent 0, bold true', () => {
    const r = row('fat')
    expect(r.amount).toBe('39 g')
    expect(r.dv).toBe(50)
    expect(r.indent).toBe(0)
    expect(r.bold).toBe(true)
  })

  it('Saturated Fat: 5 g, dv 25, indent 1, bold false', () => {
    const r = row('sat_fat_g')
    expect(r.amount).toBe('5 g')
    expect(r.dv).toBe(25)
    expect(r.indent).toBe(1)
    expect(r.bold).toBe(false)
  })

  it('Trans Fat, Cholesterol, Total Sugars, Added Sugars and Calcium have null amount and dv', () => {
    expect(row('trans_fat_g').amount).toBe(null)
    expect(row('trans_fat_g').dv).toBe(null)
    expect(row('cholesterol_mg').amount).toBe(null)
    expect(row('cholesterol_mg').dv).toBe(null)
    expect(row('sugar_g').amount).toBe(null)
    expect(row('sugar_g').dv).toBe(null)
    expect(row('added_sugar_g').amount).toBe(null)
    expect(row('added_sugar_g').dv).toBe(null)
    expect(row('calcium_mg').amount).toBe(null)
    expect(row('calcium_mg').dv).toBe(null)
  })

  it('Sodium dv 20; Total Carbohydrate dv 10; Dietary Fiber dv 10', () => {
    const s = row('sodium_mg')
    expect(s.amount).toBe('460 mg')
    expect(s.dv).toBe(20)
    const c = row('carbs')
    expect(c.amount).toBe('28 g')
    expect(c.dv).toBe(10)
    const f = row('fiber_g')
    expect(f.amount).toBe('2.8 g')
    expect(f.dv).toBe(10)
  })

  it('Protein: 10 g, dv null', () => {
    const p = row('protein')
    expect(p.amount).toBe('10 g')
    expect(p.dv).toBe(null)
  })

  it('Added Sugars has indent 2', () => {
    expect(row('added_sugar_g').indent).toBe(2)
  })

  it('Vitamin D: 2 µg, dv 10, group vitamins; last four rows are vitamins, first ten main', () => {
    const v = row('vit_d_mcg')
    expect(v.amount).toBe('2 \u00b5g')
    expect(v.dv).toBe(10)
    expect(v.group).toBe('vitamins')
    for (let i = 0; i < 10; i++) { expect(labelRows(input)[i].group).toBe('main') }
    const r = labelRows(input)
    for (let i = 10; i < 14; i++) { expect(r[i].group).toBe('vitamins') }
  })

  it('With extras {}, every extra row has null amount, macros still have amounts', () => {
    const r = labelRows({ fat_g: 39, carbs_g: 27.5, protein_g: 10, extras: {} })
    for (const k of ['sat_fat_g','trans_fat_g','cholesterol_mg','sodium_mg','fiber_g','sugar_g',
      'added_sugar_g','vit_d_mcg','calcium_mg','iron_mg','potassium_mg'] as const) {
      expect(r.find(x => x.key === k)!.amount).toBe(null)
    }
    // macros still have amounts
    expect(r.find(x => x.key === 'fat')!.amount).toBeDefined()
    expect(r.find(x => x.key === 'carbs')!.amount).toBeDefined()
    expect(r.find(x => x.key === 'protein')!.amount).toBeDefined()
  })
})

describe('servingLine', () => {
  it('formats serving size strings correctly', () => {
    expect(servingLine('g', '150', 150, null)).toBe('150 g')
    expect(servingLine('serving', '1.5', 150, '1 cup')).toBe('1.5 × 1 cup (150 g)')
    expect(servingLine('serving', '1', 30, null)).toBe('1 serving (30 g)')
    expect(servingLine('serving', '2', 60, null)).toBe('2 servings (60 g)')
  })
})
