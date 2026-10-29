import { describe, it, expect } from 'vitest'
import type { MealLog } from '../today/types'
import { csvCell, mealLogsCsv, dataFileName } from './dataExport'

function log(overrides: Partial<MealLog> = {}): MealLog {
  return {
    id: 'l1',
    user_id: 'me',
    logged_on: '2026-10-29',
    meal_type: 'lunch',
    food_id: null,
    name: 'Rice',
    quantity_g: 150,
    kcal: 195,
    protein_g: 4,
    carbs_g: 42.3,
    fat_g: 0.4,
    created_at: '2026-10-29T12:00:00Z',
    ...overrides,
  }
}

describe('dataExport', () => {
  it('csvCell', () => {
    expect(csvCell('Rice')).toBe('Rice')
    expect(csvCell('Pasta, cooked')).toBe('"Pasta, cooked"')
    expect(csvCell('5" sub')).toBe('"5"" sub"')
    expect(csvCell('a\nb')).toBe('"a\nb"')
    expect(csvCell(42.3)).toBe('42.3')
    expect(csvCell(null)).toBe('')
  })

  it('mealLogsCsv([log()])', () => {
    expect(mealLogsCsv([log()])).toBe(
      'date,meal,food,grams,calories,protein_g,carbs_g,fat_g\r\n2026-10-29,lunch,Rice,150,195,4,42.3,0.4\r\n',
    )
  })

  it('order and input immutability', () => {
    const logs = [
      log({ id: 'b', name: 'B', created_at: '2026-10-29T18:00:00Z' }),
      log({ id: 'c', name: 'C', logged_on: '2026-10-28' }),
      log({ id: 'a', name: 'A', created_at: '2026-10-29T08:00:00Z' }),
    ]
    const csv = mealLogsCsv(logs)
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain(',')
    // parse food (3rd column, index 2) from each data line
    const foods = [1, 2, 3].map(i => lines[i]?.split(',')[2])
    expect(foods).toEqual(['C', 'A', 'B'])
    expect(logs[0].name).toBe('B')
    expect(logs[1].name).toBe('C')
    expect(logs[2].name).toBe('A')
  })

  it('comma in name is quoted inside the CSV line', () => {
    const csv = mealLogsCsv([log({ name: 'Pasta, cooked' })])
    const lines = csv.split('\r\n').filter(l => l.length)
    expect(lines[1]).toBe('2026-10-29,lunch,"Pasta, cooked",150,195,4,42.3,0.4')
  })

  it('mealLogsCsv([]) has header plus \\r\\n only', () => {
    expect(mealLogsCsv([])).toBe(
      'date,meal,food,grams,calories,protein_g,carbs_g,fat_g\r\n',
    )
  })

  it('dataFileName', () => {
    expect(dataFileName('csv', '2026-10-29')).toBe('calbud-food-log-2026-10-29.csv')
    expect(dataFileName('json', '2026-10-29')).toBe('calbud-data-2026-10-29.json')
  })
})
