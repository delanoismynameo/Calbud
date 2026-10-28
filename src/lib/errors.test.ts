import { describe, it, expect } from 'vitest'
import { friendlyError } from './errors'

describe('friendlyError', () => {
  it('removes join_household: prefix and capitalizes', () => {
    const result = friendlyError('join_household: no household has that invite code')
    expect(result).toBe('No household has that invite code.')
  })

  it('removes create_household: prefix and capitalizes', () => {
    const result = friendlyError('create_household: you are already in a household')
    expect(result).toBe('You are already in a household.')
  })

  it('does not add second period when message already ends with one', () => {
    const result = friendlyError('join_household: done.')
    expect(result).toBe('Done.')
  })

  it('capitalizes and adds period when no prefix', () => {
    const result = friendlyError('network error')
    expect(result).toBe('Network error.')
  })

  it('preserves prefix text after removal, only capitalizes first letter', () => {
    const result = friendlyError('oops join_household: x')
    expect(result).toBe('Oops join_household: x.')
  })
})
