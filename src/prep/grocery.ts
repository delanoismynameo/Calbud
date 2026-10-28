export interface GroceryItem { name: string; qty: number | null; unit: string }

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase()
  switch (u) {
    case 'cups': return 'cup'
    case 'lbs': return 'lb'
    case 'cans': return 'can'
    case 'cloves': return 'clove'
    default: return u
  }
}

function makeKey(item: GroceryItem): string {
  const unit = normalizeUnit(item.unit)
  const qtyTag = item.qty === null ? 'n' : 'q'
  const name = item.name.trim().toLowerCase()
  return `${name}|${unit}|${qtyTag}`
}

export function groceryList(lists: GroceryItem[][]): GroceryItem[] {
  const merged = new Map<string, GroceryItem>()

  for (const list of lists) {
    for (const item of list) {
      const key = makeKey(item)
      const existing = merged.get(key)

      if (!existing) {
        merged.set(key, {
          name: item.name.trim(),
          qty: item.qty,
          unit: normalizeUnit(item.unit),
        })
      } else if (item.qty != null && existing.qty != null) {
        const newQty = Math.round((existing.qty + item.qty) * 100) / 100
        merged.set(key, { ...existing, qty: newQty })
      }
    }
  }

  const sorted = Array.from(merged.values())
  sorted.sort((a, b) => {
    const cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en')
    if (cmp !== 0) return cmp
    const aNum = a.qty != null ? -1 : 0
    const bNum = b.qty != null ? -1 : 0
    return aNum - bNum
  })

  return sorted
}

export function formatGroceryItem(item: GroceryItem): string {
  const parts: string[] = []
  if (item.qty != null) parts.push(String(item.qty))
  if (item.unit !== '') parts.push(item.unit)
  parts.push(item.name)
  return parts.join(' ')
}

export function groceryKey(item: GroceryItem): string {
  return `${item.name.trim().toLowerCase()}|${item.unit}|${item.qty === null ? 'n' : 'q'}`
}
