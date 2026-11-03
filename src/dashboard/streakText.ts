export function streakText(n: number, together: boolean): string {
  if (n === 0) {
    return together ? 'No streak yet. Both people logged food today to start one.' : 'No streak yet. Someone or people logged food today to start one.'
  }

  const unit = n === 1 ? 'day' : 'days'
  const suffix = n >= 60 ? '+' : ''
  const display = `${String(n)}${suffix} ${unit} in a row`

  if (together) {
    return `${display}, both people logged food today.`
  }
  return `${display}, someone logged food today.`
}
