import { describe, it, expect } from 'vitest'
import { localDateString, defaultMealType } from './dates'

describe('localDateString', () => {
  it('returns YYYY-MM-DD for 2026-01-05 23:30', () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })

  it('returns YYYY-MM-DD for 2026-12-31 00:05', () => {
    expect(localDateString(new Date(2026, 11, 31, 0, 5))).toBe('2026-12-31')
  })
})

describe('defaultMealType', () => {
  it('10:29 is breakfast', () => {
    expect(defaultMealType(new Date(2026, 0, 1, 10, 29))).toBe('breakfast')
  })

  it('10:30 is lunch', () => {
    expect(defaultMealType(new Date(2026, 0, 1, 10, 30))).toBe('lunch')
  })

  it('14:59 is lunch', () => {
    expect(defaultMealType(new Date(2026, 0, 1, 14, 59))).toBe('lunch')
  })

  it('15:00 is dinner', () => {
    expect(defaultMealType(new Date(2026, 0, 1, 15, 0))).toBe('dinner')
  })

  it('20:59 is dinner', () => {
    expect(defaultMealType(new Date(2026, 0, 1, 20, 59))).toBe('dinner')
  })

  it('21:00 is snack', () => {
    expect(defaultMealType(new Date(2026, 0, 1, 21, 0))).toBe('snack')
  })
})
