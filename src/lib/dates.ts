export function localDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function defaultMealType(d: Date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = d.getHours()
  const m = d.getMinutes()
  const minutes = h * 60 + m
  if (minutes < 630) return 'breakfast'   // before 10:30
  if (minutes < 900) return 'lunch'        // before 15:00
  if (minutes < 1260) return 'dinner'      // before 21:00
  return 'snack'
}
