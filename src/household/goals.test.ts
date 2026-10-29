import { describe, it, expect } from 'vitest'
import { parseGoals } from './goals'

describe('parseGoals', () => {
  it('parses valid goals', () => {
    expect(parseGoals({ calories: '2000', protein: '150', carbs: '250', fat: '65' }))
      .toEqual({ ok: true, goals: { goal_calories: 2000, goal_protein_g: 150, goal_carbs_g: 250, goal_fat_g: 65 } })
  })

  it('trims whitespace from all fields', () => {
    expect(parseGoals({ calories: ' 2100 ', protein: '1', carbs: '1000', fat: '70' }))
      .toEqual({ ok: true, goals: { goal_calories: 2100, goal_protein_g: 1, goal_carbs_g: 1000, goal_fat_g: 70 } })
  })

  it('rejects calories below 500', () => {
    expect(parseGoals({ calories: '400', protein: '150', carbs: '250', fat: '65' }))
      .toEqual({ ok: false, errors: { calories: 'A whole number from 500 to 10000.' } })
  })

  it('collects multiple errors for invalid non-calories fields', () => {
    expect(parseGoals({ calories: '2000', protein: '12.5', carbs: '', fat: '1001' }))
      .toEqual({ ok: false, errors: { protein: 'A whole number from 1 to 1000.', carbs: 'A whole number from 1 to 1000.', fat: 'A whole number from 1 to 1000.' } })
  })
})
