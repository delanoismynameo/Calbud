import { groceryList, groceryKey } from './grocery'
import type { GroceryItem } from './grocery'

function isValid(item: unknown): item is GroceryItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'name' in item &&
    typeof (item as { name: unknown }).name === 'string' &&
    ('qty' in item) &&
    ((item as { qty: unknown }).qty === null || typeof (item as { qty: unknown }).qty === 'number') &&
    'unit' in item &&
    typeof (item as { unit: unknown }).unit === 'string'
  )
}

export function mergeExtras(existing: GroceryItem[], added: GroceryItem[]): GroceryItem[] {
  return groceryList([existing, added])
}

export function removeExtra(existing: GroceryItem[], key: string): GroceryItem[] {
  return existing.filter(i => groceryKey(i) !== key)
}

export function loadExtras(weekStart: string): GroceryItem[] {
  try {
    const raw = localStorage.getItem('calbud:grocery-extra:' + weekStart)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every(isValid)) {
      return parsed
    }
    return []
  } catch {
    return []
  }
}

export function saveExtras(weekStart: string, items: GroceryItem[]): void {
  try {
    localStorage.setItem('calbud:grocery-extra:' + weekStart, JSON.stringify(items))
  } catch {
    // Silently fail — keep state in memory only
  }
}
