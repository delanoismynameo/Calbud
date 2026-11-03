export function streakText(n: number, together: boolean): string {
  if (n === 0) {
    if (together) return 'No streak yet. Both log some food on the same day to start one.'
    return 'No streak yet. Log some food today to start one.'
  }

  const display = n >= 60 ? '60+' : String(n)
  const unit = n === 1 ? 'day' : 'days'
  if (together) {
    return `${display} ${unit} in a row, both of you logged food.`
  }
  return `${display} ${unit} in a row with food logged.`
}
