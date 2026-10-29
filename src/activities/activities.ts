import type { Activity, ActivityFields } from './types'

export interface ActivityFormInput {
  title: string
  date: string
  startTime: string
  duration: string
  kcal: string
  notes: string
}

function isInt(s: string): boolean {
  return /^\d+$/.test(s)
}

export function parseActivityForm(input: ActivityFormInput):
  | { ok: true; fields: ActivityFields }
  | { ok: false; errors: Partial<Record<keyof ActivityFormInput, string>> } {
  const errors: Partial<Record<keyof ActivityFormInput, string>> = {}

  // title
  const titleTrimmed = input.title.trim()
  if (titleTrimmed === '') {
    errors.title = 'Give it a name.'
  } else if (titleTrimmed.length > 80) {
    errors.title = 'Keep this under 80 characters.'
  }

  // date
  const dateTrimmed = input.date.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTrimmed)) {
    errors.date = 'Pick a date.'
  }

  // startTime
  const startTimeTrimmed = input.startTime.trim()
  let start_time: string | null = null
  if (startTimeTrimmed === '') {
    start_time = null
  } else if (/^\d{2}:\d{2}$/.test(startTimeTrimmed)) {
    const [hStr, mStr] = startTimeTrimmed.split(':')
    const h = Number(hStr)
    const m = Number(mStr)
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      errors.startTime = 'Use a time like 14:30.'
    } else {
      start_time = startTimeTrimmed + ':00'
    }
  } else {
    errors.startTime = 'Use a time like 14:30.'
  }

  // duration
  const durationTrimmed = input.duration.trim()
  let duration_min: number | null = null
  if (durationTrimmed === '') {
    duration_min = null
  } else if (isInt(durationTrimmed)) {
    const num = Number(durationTrimmed)
    if (num < 1 || num > 600) {
      errors.duration = 'Enter minutes from 1 to 600.'
    } else {
      duration_min = num
    }
  } else {
    errors.duration = 'Enter minutes from 1 to 600.'
  }

  // kcal
  const kcalTrimmed = input.kcal.trim()
  let kcal_burned: number | null = null
  if (kcalTrimmed === '') {
    kcal_burned = null
  } else if (/^-?\d+$/.test(kcalTrimmed)) {
    const num = Number(kcalTrimmed)
    if (num < 0 || num > 5000) {
      errors.kcal = 'Enter calories from 0 to 5000.'
    } else {
      kcal_burned = num
    }
  } else {
    errors.kcal = 'Enter calories from 0 to 5000.'
  }

  // notes
  const notesTrimmed = input.notes.trim()
  const notes = notesTrimmed === '' ? null : notesTrimmed

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    fields: {
      title: titleTrimmed,
      scheduled_date: dateTrimmed,
      start_time,
      duration_min,
      kcal_burned,
      notes,
    },
  }
}

export function activityFormFrom(a: Activity): ActivityFormInput {
  return {
    title: a.title,
    date: a.scheduled_date,
    startTime: a.start_time ? a.start_time.slice(0, 5) : '',
    duration: a.duration_min != null ? String(a.duration_min) : '',
    kcal: a.kcal_burned != null ? String(a.kcal_burned) : '',
    notes: a.notes ?? '',
  }
}

export function sortDay(items: Activity[]): Activity[] {
  const sorted = [...items]
  sorted.sort((a, b) => {
    const aHasTime = a.start_time != null
    const bHasTime = b.start_time != null
    if (aHasTime && !bHasTime) return -1
    if (!aHasTime && bHasTime) return 1
    if (aHasTime && bHasTime) {
      return a.start_time!.localeCompare(b.start_time!)
    }
    return 0
  })
  return sorted
}

export function visibleActivities(items: Activity[], mode: 'mine' | 'both', myId: string): Activity[] {
  if (mode === 'mine') {
    return items.filter(a => a.user_id === myId)
  }
  return items
}

export function activityDetails(a: Activity): string {
  const parts: string[] = []

  // start time as HH:MM
  if (a.start_time != null) {
    parts.push(a.start_time.slice(0, 5))
  }

  // duration
  if (a.duration_min != null) {
    const hours = Math.floor(a.duration_min / 60)
    const mins = a.duration_min % 60
    if (hours > 0 && mins > 0) {
      parts.push(`${hours} h ${mins} min`)
    } else if (hours > 0) {
      parts.push(hours === 1 ? '1 h' : `${hours} h`)
    } else if (mins > 0) {
      parts.push(`${mins} min`)
    }
  }

  // kcal burned
  if (a.kcal_burned != null) {
    parts.push(`${a.kcal_burned} cal burned`)
  }

  return parts.join(' · ')
}
