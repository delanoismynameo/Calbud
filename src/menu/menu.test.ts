import { describe, it, expect } from 'vitest'
import { mealLabel, slotAt, menuCount, parseSlotLabel } from './menu'
import type { MenuSlot } from './types'

function slot(o: Partial<MenuSlot> = {}): MenuSlot {
  return { id: 's1', household_id: 'h1', slot_date: '2026-10-26', meal: 'dinner', label: 'Curry', prep_id: null, meal_prep: null, ...o }
}

describe('mealLabel', () => {
  it("mealLabel('breakfast') is 'Breakfast' and mealLabel('dinner') is 'Dinner'", () => {
    expect(mealLabel('breakfast')).toBe('Breakfast')
    expect(mealLabel('dinner')).toBe('Dinner')
  })
})

describe('slotAt', () => {
  it('finds by date and meal, returns undefined when not found', () => {
    const slots = [slot({ id: 'a' }), slot({ id: 'b', meal: 'lunch' })]
    expect(slotAt(slots, '2026-10-26', 'lunch')?.id).toBe('b')
    expect(slotAt(slots, '2026-10-26', 'breakfast')).toBe(undefined)
    expect(slotAt(slots, '2026-10-27', 'dinner')).toBe(undefined)
  })
})

describe('menuCount', () => {
  it('counts slots with given prep_id', () => {
    const p1a = slot({ id: 'p1a', prep_id: 'p1' })
    const p1b = p1a
    const p1c = { ...p1a, id: 'p1c' } as MenuSlot
    const p2  = slot({ id: 'p2',  prep_id: 'p2' })
    const nul = slot({ id: 'n1' })  // prep_id stays null from helper
    const slots = [p1a, { ...p1a, id: 'p1b' }, p1c, p2, nul] as MenuSlot[]
    expect(menuCount(slots, 'p1')).toBe(3)
    expect(menuCount(slots, 'p3')).toBe(0)
  })
})

describe('parseSlotLabel', () => {
  it("trims whitespace", () => {
    expect(parseSlotLabel('  OYO ')).toEqual({ ok: true, label: 'OYO' })
  })

  it('errors on empty text', () => {
    expect(parseSlotLabel('   ')).toEqual({ ok: false, error: 'Type something or pick a dish.' })
  })

  it('allows up to 200 chars and rejects 201', () => {
    expect(parseSlotLabel('x'.repeat(200)).ok).toBe(true)
    expect(parseSlotLabel('x'.repeat(201))).toEqual({ ok: false, error: 'Keep it under 200 characters.' })
  })
})
