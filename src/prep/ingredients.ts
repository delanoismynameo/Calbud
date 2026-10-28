export const UNITS: readonly string[] = [
  'g', 'kg', 'oz', 'lb', 'lbs', 'cup', 'cups', 'tbsp', 'tsp',
  'ml', 'l', 'can', 'cans', 'clove', 'cloves', 'pinch',
]

function isFraction(s: string): number | null {
  const m = s.match(/^(\d+)\/(\d+)$/)
  if (!m) return null
  const den = Number(m[2])
  if (den === 0) return null
  return Number(m[1]) / den
}

function readFirstNum(s: string): number | null {
  const frac = isFraction(s)
  if (frac !== null && frac > 0) return frac
  const n = Number(s)
  if (Number.isFinite(n) && n > 0) return n
  return null
}

export function parseIngredients(text: string): ReadonlyArray<{ name: string; qty: number | null; unit: string }> {
  const result: Array<{ name: string; qty: number | null; unit: string }> = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue

    const parts = trimmed.split(/\s+/)
    const qtyRaw = readFirstNum(parts[0] as string)
    const hasQty = qtyRaw !== null && qtyRaw > 0

    // Check for a unit after the number (only meaningful if hasQty)
    const unitInput = parts[1] ?? ''
    const rawUnit = UNITS.includes(unitInput.toLowerCase()) ? unitInput.toLowerCase() : ''

    if (hasQty && rawUnit) {
      // valid qty + recognized unit
      const rest = parts.slice(2).join(' ')
      if (rest === '') {
        // only qty + unit, no name → whole line is name
        result.push({ name: trimmed, qty: null, unit: '' })
      } else {
        result.push({ name: rest, qty: hasQty ? qtyRaw : null, unit: rawUnit })
      }
    } else if (hasQty) {
      // valid qty but no recognized unit for second word
      const remaining = parts.slice(1).join(' ')
      result.push({ name: remaining || trimmed, qty: qtyRaw, unit: '' })
    } else {
      // no valid number at start → entire line is name
      result.push({ name: trimmed, qty: null, unit: '' })
    }
  }
  return Object.freeze(result)
}

export function formatIngredients(
  list: ReadonlyArray<{ name: string; qty: number | null; unit: string }>,
): string {
  return list
    .map((i) => [
      i.qty != null ? String(i.qty) : '',
      i.unit,
      i.name,
    ]
      .filter(Boolean)
      .join(' ')
    )
    .join('\n')
}
