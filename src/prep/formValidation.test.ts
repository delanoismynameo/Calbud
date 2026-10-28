import { describe, it, expect } from 'vitest'
import { parsePrepForm, prepFormFrom } from './formValidation'
import type { MealPrep } from './types'

const base = (o = {}) => ({
  title: 'Sunday chili',
  date: '2026-10-25',
  startTime: '14:30',
  duration: '90',
  servings: '4',
  recipeUrl: 'https://example.com/chili',
  ingredients: '2 cup rice\n1.5 lb beef',
  notes: 'Use ground turkey instead.',
  ...o,
})

const fullInput = base()

describe('parsePrepForm – valid full input', () => {
  it('returns every field correctly', () => {
    const result = parsePrepForm(fullInput)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields).toEqual({
        title: 'Sunday chili',
        scheduled_date: '2026-10-25',
        start_time: '14:30:00',
        duration_min: 90,
        servings: 4,
        recipe_url: 'https://example.com/chili',
        ingredients: [
          { name: 'rice', qty: 2, unit: 'cup' },
          { name: 'beef', qty: 1.5, unit: 'lb' },
        ],
        notes: 'Use ground turkey instead.',
      })
    }
  })
})

describe('parsePrepForm – minimal input', () => {
  it('title + date only gives defaults', () => {
    const result = parsePrepForm({ title: 'Quick pasta', date: '2026-11-01', startTime: '', duration: '', servings: '', recipeUrl: '', ingredients: '', notes: '' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields.start_time).toBeNull()
      expect(result.fields.duration_min).toBe(60)
      expect(result.fields.servings).toBe(1)
      expect(result.fields.recipe_url).toBeNull()
      expect(result.fields.ingredients).toEqual([])
      expect(result.fields.notes).toBeNull()
    }
  })
})

describe('parsePrepForm – invalid title and date', () => {
  it('both errors shown', () => {
    const result = parsePrepForm({ title: '', date: 'not-a-date', startTime: '', duration: '', servings: '', recipeUrl: '', ingredients: '', notes: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.title).toBe('Give it a name.')
      expect(result.errors.date).toBe('Pick a date.')
    }
  })
})

describe('parsePrepForm – 81-char title', () => {
  it('is an error', () => {
    const result = parsePrepForm({ title: 'a'.repeat(81), date: '2026-10-25', startTime: '', duration: '', servings: '', recipeUrl: '', ingredients: '', notes: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.title).toBe('Keep this under 80 characters.')
    }
  })
})

describe('parsePrepForm – startTime', () => {
  it("'9:5' is an error", () => {
    const result = parsePrepForm({ title: 'test', date: '2026-10-25', startTime: '9:5', duration: '', servings: '', recipeUrl: '', ingredients: '', notes: '' })
    expect(result.ok).toBe(false)
  })

  it("'09:05' gives '09:05:00'", () => {
    const result = parsePrepForm({ title: 'test', date: '2026-10-25', startTime: '09:05', duration: '', servings: '', recipeUrl: '', ingredients: '', notes: '' })
    if (!result.ok) throw new Error('unexpected error')
    expect(result.fields.start_time).toBe('09:05:00')
  })
})

describe('parsePrepForm – duration', () => {
  it("'0' is an error", () => {
    const result = parsePrepForm({ title: 'test', date: '2026-10-25', startTime: '', duration: '0', servings: '', recipeUrl: '', ingredients: '', notes: '' })
    expect(result.ok).toBe(false)
  })

  it("'601' is an error", () => {
    const result = parsePrepForm({ title: 'test', date: '2026-10-25', startTime: '', duration: '601', servings: '', recipeUrl: '', ingredients: '', notes: '' })
    expect(result.ok).toBe(false)
  })

  it("'1.5' is an error", () => {
    const result = parsePrepForm({ title: 'test', date: '2026-10-25', startTime: '', duration: '1.5', servings: '', recipeUrl: '', ingredients: '', notes: '' })
    expect(result.ok).toBe(false)
  })
})

describe('parsePrepForm – servings', () => {
  it("'51' is an error", () => {
    const result = parsePrepForm({ title: 'test', date: '2026-10-25', startTime: '', duration: '', servings: '51', recipeUrl: '', ingredients: '', notes: '' })
    expect(result.ok).toBe(false)
  })
})

describe('parsePrepForm – recipeUrl', () => {
  it("'example.com' is an error", () => {
    const result = parsePrepForm({ title: 'test', date: '2026-10-25', startTime: '', duration: '', servings: '', recipeUrl: 'example.com', ingredients: '', notes: '' })
    expect(result.ok).toBe(false)
  })

  it("'https://example.com' passes", () => {
    const result = parsePrepForm({ title: 'test', date: '2026-10-25', startTime: '', duration: '', servings: '', recipeUrl: 'https://example.com', ingredients: '', notes: '' })
    if (!result.ok) throw new Error('unexpected error')
    expect(result.fields.recipe_url).toBe('https://example.com')
  })
})

describe('prepFormFrom → parsePrepForm round-trip', () => {
  it('full row round-trips correctly', () => {
    const row: MealPrep = {
      id: 'row-1',
      household_id: 'hh-1',
      created_by: null,
      title: 'Curry night',
      scheduled_date: '2026-11-15',
      start_time: '18:00:00',
      duration_min: 45,
      servings: 3,
      recipe_url: 'https://example.com/curry',
      ingredients: [{ name: 'rice', qty: 2, unit: 'cup' }, { name: 'carrot', qty: 1, unit: '' }],
      notes: 'extra spices',
      status: 'planned',
      created_at: '2026-11-14T10:00:00Z',
    }

    const form = prepFormFrom(row)
    const parsed = parsePrepForm(form)
    if (!parsed.ok) throw new Error('round-trip parse failed')
    const f = parsed.fields

    expect(f.title).toBe(row.title)
    expect(f.scheduled_date).toBe(row.scheduled_date)
    expect(f.start_time).toBe('18:00:00')
    expect(f.duration_min).toBe(45)
    expect(f.servings).toBe(3)
    expect(f.recipe_url).toBe('https://example.com/curry')
    expect(f.ingredients).toEqual([
      { name: 'rice', qty: 2, unit: 'cup' },
      { name: 'carrot', qty: 1, unit: '' },
    ])
    expect(f.notes).toBe('extra spices')
  })
})
