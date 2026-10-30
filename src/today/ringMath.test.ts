import { describe, it, expect } from 'vitest'
import { ringDash } from './ringMath'

const C = 2 * Math.PI * 72 // circumference for r=72

describe('ringDash', () => {
  it('consumed 0 gives the full circumference', () => {
    const result = ringDash(0, 2000, C)
    expect(result.offset).toBeCloseTo(C)
    expect(result.over).toBe(false)
  })

  it('half of goal gives half the circumference', () => {
    const result = ringDash(1000, 2000, C)
    expect(result.offset).toBeCloseTo(C / 2)
    expect(result.over).toBe(false)
  })

  it('exactly the goal gives offset 0 and over false', () => {
    const result = ringDash(2000, 2000, C)
    expect(result.offset).toBe(0)
    expect(result.over).toBe(false)
  })

  it('above the goal gives offset 0 and over true', () => {
    const result = ringDash(3000, 2000, C)
    expect(result.offset).toBe(0)
    expect(result.over).toBe(true)
  })

  it('-goal 0 gives an empty ring (offset equals the circumference) and over false', () => {
    const result = ringDash(500, 0, C)
    expect(result.offset).toBe(C)
    expect(result.over).toBe(false)
  })

  it('negative consumed gives an empty ring', () => {
    const result = ringDash(-100, 2000, C)
    expect(result.offset).toBeCloseTo(C)
    expect(result.over).toBe(false)
  })

  it('NaN consumed gives an empty ring', () => {
    const result = ringDash(NaN, 2000, C)
    expect(result.offset).toBeCloseTo(C)
    expect(result.over).toBe(false)
  })
})
