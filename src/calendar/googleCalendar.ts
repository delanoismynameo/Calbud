import type { CalEvent } from './ics'

/**
 * Build a Google Calendar add-event URL from a CalEvent.
 * Uses Google's template URL format with URL-encoded parameters.
 * Opens in a new tab (target _blank).
 * 
 * Google Calendar URL format:
 * https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&ctz=...
 * 
 * Dates format:
 * - Timed events: YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS (local time, no Z suffix)
 * - All-day events: YYYYMMDD/YYYYMMDD+1 (end is next day)
 */
export function toGoogleCalendarUrl(event: CalEvent, timeZone: string): string {
  const baseUrl = 'https://calendar.google.com/calendar/render'
  
  // Build the dates parameter
  let dates: string
  if (event.startTime === null) {
    // All-day event: use DATE format (YYYYMMDD/YYYYMMDD+1) where end is next day
    const startCompact = formatDateOnly(event.date)
    const endCompact = nextDateCompact(event.date)
    dates = `${startCompact}/${endCompact}`
  } else {
    // Timed event: use DATETIME format (YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS) in local time
    const durationMin = event.durationMin ?? 60
    const { startDateTime, endDateTime } = calculateTimedDateTime(event.date, event.startTime, durationMin)
    dates = `${startDateTime}/${endDateTime}`
  }
  
  // Build query string manually for better control over encoding
  // We want:
  // - text and details encoded with encodeURIComponent
  // - dates as-is (the / separator must remain unescaped for Google Calendar)
  // - ctz encoded with encodeURIComponent
  const text = encodeURIComponent(event.title)
  const details = (event.notes != null && event.notes.trim() !== '') ? `&details=${encodeURIComponent(event.notes)}` : ''
  const ctz = encodeURIComponent(timeZone)
  
  return `${baseUrl}?action=TEMPLATE&text=${text}&dates=${dates}${details}&ctz=${ctz}`
}

function formatDateOnly(date: string): string {
  // Convert YYYY-MM-DD to YYYYMMDD
  return date.replace(/-/g, '')
}

function nextDateCompact(date: string): string {
  // Add one day to YYYY-MM-DD and return as YYYYMMDD
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day) + 86_400_000)
  return (
    next.getUTCFullYear().toString().padStart(4, '0') +
    (next.getUTCMonth() + 1).toString().padStart(2, '0') +
    next.getUTCDate().toString().padStart(2, '0')
  )
}

interface TimedDateTime {
  startDateTime: string // YYYYMMDDTHHMMSS
  endDateTime: string   // YYYYMMDDTHHMMSS (may span to next day)
}

function calculateTimedDateTime(date: string, startTime: string, durationMin: number): TimedDateTime {
  const [dateYear, dateMonth, dateDay] = date.split('-').map(Number)
  
  // Parse time (HH:MM format)
  const [timeHour, timeMinute] = startTime.split(':').map(Number)
  
  // Calculate total minutes from midnight at start time
  const startMinutesFromMidnight = timeHour * 60 + timeMinute
  
  // Calculate total minutes at end time
  const endMinutesFromMidnight = startMinutesFromMidnight + durationMin
  
  // Calculate how many days have passed
  const daysToAdd = Math.floor(endMinutesFromMidnight / (24 * 60))
  
  // Calculate end hour and minute
  const endMinutesInDay = endMinutesFromMidnight % (24 * 60)
  const endHour = Math.floor(endMinutesInDay / 60)
  const endMinute = endMinutesInDay % 60
  
  // Calculate the end date using UTC arithmetic
  const endDateUtc = new Date(Date.UTC(dateYear, dateMonth - 1, dateDay) + daysToAdd * 86_400_000)
  const endYear = endDateUtc.getUTCFullYear()
  const endMonth = endDateUtc.getUTCMonth() + 1
  const endDay = endDateUtc.getUTCDate()
  
  // Format start datetime
  const startYear = dateYear.toString().padStart(4, '0')
  const startMonth = dateMonth.toString().padStart(2, '0')
  const startDay = dateDay.toString().padStart(2, '0')
  const startHourStr = timeHour.toString().padStart(2, '0')
  const startMinuteStr = timeMinute.toString().padStart(2, '0')
  
  const startDateTime = `${startYear}${startMonth}${startDay}T${startHourStr}${startMinuteStr}00`
  
  // Format end datetime
  const endYearStr = endYear.toString().padStart(4, '0')
  const endMonthStr = endMonth.toString().padStart(2, '0')
  const endDayStr = endDay.toString().padStart(2, '0')
  const endHourStr = endHour.toString().padStart(2, '0')
  const endMinuteStr = endMinute.toString().padStart(2, '0')
  
  const endDateTime = `${endYearStr}${endMonthStr}${endDayStr}T${endHourStr}${endMinuteStr}00`
  
  return { startDateTime, endDateTime }
}