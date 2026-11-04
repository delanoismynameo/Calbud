import { describe, it, expect, vi, beforeEach } from 'vitest'
import { photoPath, extractStoragePath, isOfflinePhoto } from './storage'

describe('photoPath', () => {
  it('generates correct path for a food photo', () => {
    expect(photoPath('household-1', 'food-2')).toBe('household-1/food-2.jpg')
  })

  it('uses custom file extension when provided', () => {
    expect(photoPath('household-1', 'food-2', 'png')).toBe('household-1/food-2.png')
  })
})

describe('extractStoragePath', () => {
  it('returns the path unchanged if it is a relative path', () => {
    expect(extractStoragePath('household-1/food-2.jpg')).toBe('household-1/food-2.jpg')
  })

  it('extracts path from a full URL with signed parameters', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/sign/household_photos/household-1/food-2.jpg?expires=60&token=mock'
    expect(extractStoragePath(url)).toBe('household-1/food-2.jpg')
  })

  it('returns null for non-household URLs', () => {
    expect(extractStoragePath('https://images.openfoodfacts.org/images/products/abc.jpg')).toBeNull()
  })
})

describe('isOfflinePhoto', () => {
  it('returns true for Open Food Facts URLs', () => {
    expect(isOfflinePhoto('https://images.openfoodfacts.org/images/products/abc.jpg')).toBe(true)
    expect(isOfflinePhoto('https://images.openfoodfacts.org/images/products/123/456/789/12345.jpg')).toBe(true)
  })

  it('returns false for null/undefined', () => {
    expect(isOfflinePhoto(null as unknown as string)).toBe(false)
    expect(isOfflinePhoto(undefined as unknown as string)).toBe(false)
  })

  it('returns false for other URLs', () => {
    expect(isOfflinePhoto('https://example.com/photo.jpg')).toBe(false)
    expect(isOfflinePhoto('household-1/food-2.jpg')).toBe(false)
  })
})