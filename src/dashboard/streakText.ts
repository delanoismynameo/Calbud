export function streakText(n: number, together: boolean): string {
  if (n === 0) {
    if (together) return 'No streak yet. Both finish a day within 10% of your goals to start one.'
    return 'No streak yet. Finish a day within 10% of your goal to start one.'
  }

  const display = n >= 60 ? '60+' : String(n)
  const unit = n === 1 ? 'day' : 'days'
  if (together) {
    return `${display} ${unit} in a row, both within 10% of your goals.`
  }
  return `${display} ${unit} in a row within 10% of your goal.`
}
