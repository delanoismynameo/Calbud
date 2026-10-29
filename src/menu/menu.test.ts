import { describe, it, expect } from 'vitest'
import { mealLabel, slotAt, menuCount, parseSlotLabel, copyRows, repeatMenuRows } from './menu'
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

describe('copyRows', () => {
  it("test 1: copyRows('2026-03-01', 'dinner', 'Curry', null, ['2026-03-01', '2026-03-03']) equals [{ slot_date: '2026-03-03', meal: 'dinner', label: 'Curry', prep_id: null }]", () => {
    expect(copyRows('2026-03-01', 'dinner', 'Curry', null, ['2026-03-01', '2026-03-03'])).toEqual([{ slot_date: '2026-03-03', meal: 'dinner', label: 'Curry', prep_id: null }])
  })

  it("test 2: copyRows with prepId 'p1' keeps prep_id: 'p1' on every row", () => {
    expect(copyRows('2026-03-01', 'lunch', 'Salad', 'p1', ['2026-03-01', '2026-03-02', '2026-03-05']).map(r => r.prep_id)).toEqual(['p1', 'p1'])
  })
})

describe('repeatMenuRows', () => {
  it('test 3: a lunch on 2026-03-01 and dinner on 2026-03-02, with thisWeek empty, gives same two meals on 2026-03-08 and 2026-03-09, both prep_id: null', () => {
    const lastWeek = [
      slot({ id: 'a', slot_date: '2026-03-01', meal: 'lunch', label: 'Salad' }),
      slot({ id: 'b', slot_date: '2026-03-02', meal: 'dinner', label: 'Curry' }),
    ]
    expect(repeatMenuRows(lastWeek, [])).toEqual([
      { slot_date: '2026-03-08', meal: 'lunch', label: 'Salad', prep_id: null },
      { slot_date: '2026-03-09', meal: 'dinner', label: 'Curry', prep_id: null },
    ])
  })

  it('test 4: if thisWeek already has a slot on 2026-03-08 lunch, that one is skipped and the dinner is kept', () => {
    const lastWeek = [
      slot({ id: 'a', slot_date: '2026-03-01', meal: 'lunch', label: 'Salad' }),
      slot({ id: 'b', slot_date: '2026-03-02', meal: 'dinner', label: 'Curry' }),
    ]
    const thisWeek = [slot({ id: 'c', slot_date: '2026-03-08', meal: 'lunch', label: 'Burger' })]
    expect(repeatMenuRows(lastWeek, thisWeek)).toEqual([
      { slot_date: '2026-03-09', meal: 'dinner', label: 'Curry', prep_id: null },
    ])
  })

  it('test 5: repeatMenuRows([], []) equals []', () => {
    expect(repeatMenuRows([], [])).toEqual([])
  })
})
