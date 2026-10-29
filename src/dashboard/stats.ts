import { addDays } from '../prep/week'

export interface KcalRow { user_id: string; logged_on: string; kcal: number }
export type ByDay = Record<string, number> // date → that day's kcals

// Per user, per date: the summed kcal, each sum rounded with Math.round at the end.
export function kcalByUserDay(rows: KcalRow[]): Record<string, ByDay> {
  const result: Record<string, ByDay> = {}
  for (const row of rows) {
    if (!result[row.user_id]) result[row.user_id] = {}
    const dayKcal = result[row.user_id][row.logged_on]
    result[row.user_id][row.logged_on] = Math.round((dayKcal ?? 0) + row.kcal)
  }
  return result
}

// The 7 dates ending at `today`, oldest first: addDays(today, -6) … today.
export function lastWeek(today: string): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    days.push(addDays(today, -i))
  }
  return days
}

// The average kcal over those `dates` that have an entry in `byDay`, rounded with Math.round. null when none has one, or byDay is undefined.
export function averageKcal(byDay: ByDay | undefined, dates: string[]): number | null {
  if (!byDay) return null

  let sum = 0
  let count = 0

  for (const date of dates) {
    const kcal = byDay[date]
    if (kcal !== undefined) {
      sum += kcal
      count++
    }
  }

  if (count === 0) return null

  return Math.round(sum / count)
}

// On target: kcal is not undefined and Math.abs(kcal - goal) <= goal * tolerance.
export function onTarget(kcal: number | undefined, goal: number, tolerance = 0.1): boolean {
  if (kcal === undefined) return false
  return Math.abs(kcal - goal) <= goal * tolerance
}

// Days in a row, counting back, on which every person was on target (default tolerance).
// Start at `today` if everyone is on target today; otherwise start at addDays(today, -1), because today isn't over yet.
// Stop at the first day on which someone isn't on target, or once maxDays days have been counted.
// An empty `people` list gives 0.
export function streak(people: { byDay: ByDay | undefined; goal: number }[], today: string, maxDays: number): number {
  if (people.length === 0) return 0

  // Check if everyone is on target today
  let allOnTargetToday = true
  for (const person of people) {
    const kcal = person.byDay?.[today]
    if (!onTarget(kcal, person.goal)) {
      allOnTargetToday = false
      break
    }
  }

  // Start date: today if everyone on target, otherwise yesterday
  let startDate = addDays(today, -1)
  if (allOnTargetToday) {
    startDate = today
  }

  let count = 0
  for (let i = 0; i < maxDays; i++) {
    const date = addDays(startDate, -i)

    // Check every person is on target for this date
    let allOnTarget = true
    for (const person of people) {
      if (!onTarget(person.byDay?.[date], person.goal)) {
        allOnTarget = false
        break
      }
    }

    if (allOnTarget) {
      count++
    } else {
      break
    }
  }

  return count
}
