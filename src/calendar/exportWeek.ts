import type { Activity } from '../activities/types'
import type { CalEvent } from './ics'

/**
 * Map activities to calendar events, sorted by date then start time.
 * Timed events come before untimed events on the same day.
 * Untimed events preserve input order (stable sort).
 */
export function activityEvents(
  items: Activity[],
  names: Record<string, string>,
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
    let title: string
    if (prefixNames && names[item.user_id]) {
      title = `${names[item.user_id]}: ${item.title}`
    } else {
      title = item.title
    }

    return {
      uid: 'activity-' + item.id,
      title,
      date: item.scheduled_date,
      startTime: item.start_time,
      durationMin: item.duration_min,
      notes: item.notes,
    }
  })
}

export function exportFileName(weekStart: string): string {
  return `calbud-${weekStart}.ics`
}

export function isIosStandalone(userAgent: string, maxTouchPoints: number, standalone: boolean): boolean {
  if (!standalone) return false
  const isiPhone = userAgent.includes('iPhone')
  const isiPad = userAgent.includes('Macintosh') && maxTouchPoints > 1
  return isiPhone || isiPad
}

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled'

export interface ShareNav {
  canShare?: (data: { files: File[] }) => boolean
  share?: (data: { files: File[]; title: string }) => Promise<void>
}

export async function deliverIcs(
  file: File,
  preferShare: boolean,
  nav: ShareNav,
  download: (file: File) => void,
): Promise<DeliverResult> {
  if (!preferShare) {
    download(file)
    return 'downloaded'
  }

  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Calbud week' })
      return 'shared'
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return 'cancelled'
      }
      download(file)
      return 'downloaded'
    }
  }

  download(file)
  return 'downloaded'
}
