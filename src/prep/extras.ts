import { groceryList, groceryKey } from './grocery'
import type { GroceryItem } from './grocery'

export function mergeExtras(existing: GroceryItem[], added: GroceryItem[]): GroceryItem[] {
  return groceryList([existing, added])
}

export function removeExtra(existing: GroceryItem[], key: string): GroceryItem[] {
  return existing.filter(i => groceryKey(i) !== key)
}
