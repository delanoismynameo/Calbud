import type { MenuSlot } from './types'

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
