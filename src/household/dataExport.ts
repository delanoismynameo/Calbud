import type { MealLog } from '../today/types'

const QUOTE = /[,\"\r\n]/

export function csvCell(value: string | number | null): string {
  if (value === null) return ''
  const str = typeof value === 'number' ? String(value) : value
  if (QUOTE.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

const HEADER = 'date,meal,food,grams,calories,protein_g,carbs_g,fat_g'

export function mealLogsCsv(logs: MealLog[]): string {
  const sorted = [...logs].sort((a, b) => {
    if (a.logged_on < b.logged_on) return -1
    if (a.logged_on > b.logged_on) return 1
    if (a.created_at < b.created_at) return -1
    if (a.created_at > b.created_at) return 1
    return 0
  })
  const body = sorted.map(
    log => [
      csvCell(log.logged_on),
      csvCell(log.meal_type),
      csvCell(log.name),
      csvCell(log.quantity_g),
      csvCell(log.kcal),
      csvCell(log.protein_g),
      csvCell(log.carbs_g),
      csvCell(log.fat_g),
    ].join(',')
  )
  return HEADER + '\r\n' + body.join('\r\n') + (body.length ? '\r\n' : '')
}

export function dataFileName(kind: 'csv' | 'json', today: string): string {
  if (kind === 'csv') return `calbud-food-log-${today}.csv`
  return `calbud-data-${today}.json`
}
