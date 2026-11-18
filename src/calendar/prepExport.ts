import type { MealPrep } from '../prep/types'
import type { CalEvent } from './ics'

/**
 * Map meal-prep sessions to calendar events, sorted by date then start time.
 * Timed sessions come before untimed sessions on the same day.
 * Untimed sessions preserve input order (stable sort).
 */
export function prepEvents(
  items: MealPrep[],
  prefixNames: boolean,
): CalEvent[] {
  const sorted = [...items]

  sorted.sort((a, b) => {
    const dateCmp = a.scheduled_date.localeCompare(b.scheduled_date)
    if (dateCmp !== 0) return dateCmp

    const aTimed = a.start_time != null
    const bTimed = b.start_time != null

    if (aTimed && !bTimed) return -1
    if (!aTimed && bTimed) return 1

    if (aTimed && bTimed) {
      return a.start_time!.localeCompare(b.start_time!)
    }

    return 0
  })

  return sorted.map((item) => {
    const title = prefixNames ? item.title : item.title

    return {
      uid: 'prep-' + item.id,
      title,
      date: item.scheduled_date,
      startTime: item.start_time ? item.start_time.slice(0, 5) : null,
      durationMin: item.duration_min,
      notes: item.notes ?? undefined,
    }
  })
}
