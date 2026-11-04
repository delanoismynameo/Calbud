import { describe, it, expect } from 'vitest'
import { newPhotoPath, isPhotoPath, shrunkSize } from './storage'

const H = '11111111-2222-3333-4444-555555555555'
const ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

describe('newPhotoPath', () => {
  it('puts the photo in the household folder as a jpg', () => {
    expect(newPhotoPath(H, ID)).toBe(`${H}/${ID}.jpg`)
  })

  it('makes a new name each time', () => {
    expect(newPhotoPath(H)).not.toBe(newPhotoPath(H))
  })
})

describe('isPhotoPath', () => {
  it('accepts a path made by newPhotoPath', () => {
    expect(isPhotoPath(newPhotoPath(H))).toBe(true)
  })

  it('rejects web addresses, empty values and other shapes', () => {
    expect(isPhotoPath('https://images.openfoodfacts.org/images/products/123/front.jpg')).toBe(false)
    expect(isPhotoPath(null)).toBe(false)
    expect(isPhotoPath(undefined)).toBe(false)
    expect(isPhotoPath('')).toBe(false)
    expect(isPhotoPath(`${H}/../${ID}.jpg`)).toBe(false)
    expect(isPhotoPath(`${ID}.jpg`)).toBe(false)
  })
})

describe('shrunkSize', () => {
  it('shrinks a large landscape photo to 1200 px wide', () => {
    expect(shrunkSize(4032, 3024)).toEqual({ width: 1200, height: 900 })
  })

  it('shrinks a large portrait photo to 1200 px tall', () => {
    expect(shrunkSize(3024, 4032)).toEqual({ width: 900, height: 1200 })
  })

  it('never makes a small photo bigger', () => {
    expect(shrunkSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})
