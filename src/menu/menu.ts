import type { MenuSlot, MenuMeal } from './types'
import { addDays } from '../prep/week'

export interface SlotRow { slot_date: string; meal: MenuMeal; label: string; prep_id: string | null }

export function copyRows(from: string, meal: MenuMeal, label: string, prepId: string | null, dates: string[]): SlotRow[] {
  return dates.filter(d => d !== from).map(date => ({ slot_date: date, meal, label, prep_id: prepId }))
}

export function repeatMenuRows(lastWeek: MenuSlot[], thisWeek: MenuSlot[]): SlotRow[] {
  const filled = new Set(thisWeek.map(s => `${s.slot_date},${s.meal}`))
  return lastWeek
    .map(s => ({ ...s, slot_date: addDays(s.slot_date, 7) }))
    .filter(r => !filled.has(`${r.slot_date},${r.meal}`))
    .map(r => ({ slot_date: r.slot_date, meal: r.meal, label: r.label, prep_id: null }))
}

export function mealLabel(meal: string): string {
  return meal.charAt(0).toUpperCase() + meal.slice(1)
}

export function slotAt(slots: MenuSlot[], date: string, meal: string): MenuSlot | undefined {
  return slots.find(s => s.slot_date === date && s.meal === meal)
}

export function menuCount(slots: MenuSlot[], prepId: string): number {
  return slots.filter(s => s.prep_id === prepId).length
}

export function parseSlotLabel(text: string): { ok: true; label: string } | { ok: false; error: string } {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: false, error: 'Type something or pick a dish.' }
  if (trimmed.length > 200) return { ok: false, error: 'Keep it under 200 characters.' }
  return { ok: true, label: trimmed }
}
