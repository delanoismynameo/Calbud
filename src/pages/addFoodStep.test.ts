import { describe, it, expect } from 'vitest'
import { stepFrom, stepState } from './addFoodStep'

describe('stepFrom', () => {
  it('reads back the steps stepState writes', () => {
    expect(stepFrom(stepState('food'))).toBe('food')
    expect(stepFrom(stepState('create'))).toBe('create')
  })

  it('is null for the search entry and for state it did not write', () => {
    expect(stepFrom(null)).toBeNull()
    expect(stepFrom(undefined)).toBeNull()
    expect(stepFrom('food')).toBeNull()
    expect(stepFrom({})).toBeNull()
    expect(stepFrom({ addFoodStep: 'other' })).toBeNull()
    expect(stepFrom({ key: 'abc', usr: null })).toBeNull()
  })
})
