import { describe, it, expect } from 'vitest'
import { normalizeBarcode } from './barcode'

describe('normalizeBarcode', () => {
  it('3017624010701 returns itself', () => {
    expect(normalizeBarcode('3017624010701')).toBe('3017624010701')
  })

  it('strips spaces and hyphens then validates check digit', () => {
    expect(normalizeBarcode(' 3017-6240 10701 ')).toBe('3017624010701')
  })

  it('rejects wrong check digit', () => {
    expect(normalizeBarcode('3017624010702')).toBeNull()
  })

  it('validates 12-digit code', () => {
    expect(normalizeBarcode('036000291452')).toBe('036000291452')
  })

  it('validates 14-digit code', () => {
    expect(normalizeBarcode('10036000291459')).toBe('10036000291459')
  })

  it('accepts two 8-digit codes without check digit test', () => {
    expect(normalizeBarcode('01234565')).toBe('01234565')
    expect(normalizeBarcode('12345678')).toBe('12345678')
  })

  it('rejects codes with non-digit characters', () => {
    expect(normalizeBarcode('30176abc10701')).toBeNull()
  })

  it('rejects empty, too-short, and invalid-length strings', () => {
    expect(normalizeBarcode('')).toBeNull()
    expect(normalizeBarcode('1234567')).toBeNull()
    expect(normalizeBarcode('1234567890')).toBeNull()
  })
})
