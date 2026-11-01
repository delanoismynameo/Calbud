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

// The 8-digit UPC-E form of a 12-digit UPC-A code (or 13 digits starting with 0), or null when it has none.
// Some readers report a short UPC-E barcode, like the gum's 02289902, in this long form, and Open Food Facts files the two separately.
export function compressUpcE(code: string): string | null {
  const a = code.length === 13 && code.startsWith('0') ? code.slice(1) : code
  if (!/^[01]\d{11}$/.test(a)) return null
  const m = a.slice(1, 6)
  const p = a.slice(6, 11)
  let six: string | null = null
  if (/^\d\d[012]00$/.test(m) && p.startsWith('00')) six = m.slice(0, 2) + p.slice(2) + m[2]
  else if (/^\d\d\d00$/.test(m) && p.startsWith('000')) six = m.slice(0, 3) + p.slice(3) + '3'
  else if (/^\d\d\d\d0$/.test(m) && p.startsWith('0000')) six = m.slice(0, 4) + p[4] + '4'
  else if (p.startsWith('0000') && /[5-9]/.test(p[4])) six = m + p[4]
  return six ? a[0] + six + a[11] : null
}
