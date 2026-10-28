export function normalizeBarcode(text: string): string | null {
  const cleaned = text.replace(/[\s\-]/g, '')
  if (!/^\d+$/.test(cleaned)) return null
  const len = cleaned.length
  if (![8, 12, 13, 14].includes(len)) return null

  // Length 8: no check digit test (may be UPC-E)
  if (len === 8) return cleaned

  // Check digit is the last digit
  const digits = cleaned.split('').map(Number)
  // Starting from the rightmost non-final digit, multiply by 3, 1, 3, 1, …
  let sum = 0
  let pos = 0
  for (let i = len - 2; i >= 0; i--) {
    sum += digits[i] * ((pos % 2 === 0) ? 3 : 1)
    pos++
  }
  const expectedCheck = (10 - (sum % 10)) % 10
  if (digits[len - 1] !== expectedCheck) return null
  return cleaned
}
