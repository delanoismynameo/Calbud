export interface CalEvent {
  uid: string                  // stable id, e.g. 'prep-123'
  title: string
  date: string                 // 'YYYY-MM-DD', the local calendar day
  startTime: string | null     // local wall time 'HH:MM' or 'HH:MM:SS', or null for an all-day event
  durationMin: number | null   // used only when startTime is set; null means 60
  notes?: string | null
}

export interface IcsOptions {
  timeZone: string             // IANA name, e.g. 'America/New_York': the zone the local times are in
  now: Date                    // for DTSTAMP, passed in so tests are exact
  calendarName?: string
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function daysInMonth(year: number, month: number): number {
  const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month < 1 || month > 12) return 0
  if (month !== 2) return dim[month - 1]
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return leap ? 29 : 28
}

function parseDate(date: string): [number, number, number] {
  const m = DATE_RE.exec(date)
  if (!m) throw new Error(`Invalid date: ${date}`)
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (day < 1 || day > daysInMonth(year, month)) throw new Error(`Invalid date: ${date}`)
  return [year, month, day]
}

function parseTime(time: string): [number, number, number] {
  const m = TIME_RE.exec(time)
  if (!m) throw new Error(`Invalid time: ${time}`)
  const hour = Number(m[1])
  const minute = Number(m[2])
  const second = m[3] === undefined ? 0 : Number(m[3])
  if (hour > 23 || minute > 59 || second > 59) throw new Error(`Invalid time: ${time}`)
  return [hour, minute, second]
}

function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    throw new Error(`Invalid time zone: ${timeZone}`)
  }
}

// The zone's wall clock at an instant, as a UTC-number (Date.UTC of the parts).
function wallClock(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? NaN)
  const [y, mo, d, h, mi, s] = [get('year'), get('month'), get('day'), get('hour'), get('minute'), get('second')]
  if ([y, mo, d, h, mi, s].some(Number.isNaN)) throw new Error(`Invalid time zone: ${timeZone}`)
  return Date.UTC(y, mo - 1, d, h, mi, s)
}

function zoneOffsetMs(instant: number, timeZone: string): number {
  return wallClock(instant, timeZone) - instant
}

export function localToUtc(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = parseDate(date)
  const [h, mi, s] = parseTime(time)
  assertTimeZone(timeZone)
  // Guess as if the wall time were UTC, then shift by the zone offset seen at the guess.
  const target = Date.UTC(y, mo - 1, d, h, mi, s)
  const offset1 = zoneOffsetMs(target, timeZone)
  let instant = target - offset1
  const offset2 = zoneOffsetMs(instant, timeZone)
  if (offset2 !== offset1) {
    // The two instants sit on different sides of a DST change. Retry with the
    // other offset, but only accept it if that wall clock really shows the
    // requested time: a wall time inside a spring-forward gap matches neither
    // offset, in which case the first answer (pre-change offset) stands.
    const candidate = target - offset2
    if (wallClock(candidate, timeZone) === target) instant = candidate
  }
  return new Date(instant)
}

function formatUtc(date: Date): string {
  return (
    String(date.getUTCFullYear()) +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    'T' +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes()) +
    pad2(date.getUTCSeconds()) +
    'Z'
  )
}

function compactDate(date: string): string {
  const [y, mo, d] = parseDate(date)
  return String(y) + pad2(mo) + pad2(d)
}

// Next calendar day via UTC arithmetic, so month/year ends roll over correctly.
function nextDayCompact(date: string): string {
  const [y, mo, d] = parseDate(date)
  const next = new Date(Date.UTC(y, mo - 1, d) + 86_400_000)
  return String(next.getUTCFullYear()) + pad2(next.getUTCMonth() + 1) + pad2(next.getUTCDate())
}

// Backslash must be escaped first, or it would corrupt the other escapes.
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/\n/g, '\\n')
}

// Split a logical line into physical lines of ≤ 75 bytes, continuation lines
// prefixed with one space, never cutting inside a UTF-8 character.
function foldLine(line: string): string[] {
  const bytes = new TextEncoder().encode(line)
  const physical: string[] = []
  let pos = 0
  while (pos < bytes.length) {
    const budget = physical.length === 0 ? 75 : 74
    let end = Math.min(pos + budget, bytes.length)
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--
    physical.push((physical.length === 0 ? '' : ' ') + new TextDecoder().decode(bytes.subarray(pos, end)))
    pos = end
  }
  return physical
}

function eventLines(event: CalEvent, options: IcsOptions): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${event.uid}@calbud`, `DTSTAMP:${formatUtc(options.now)}`]
  if (event.startTime === null) {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`)
    lines.push(`DTEND;VALUE=DATE:${nextDayCompact(event.date)}`)
  } else {
    const start = localToUtc(event.date, event.startTime, options.timeZone)
    const end = new Date(start.getTime() + (event.durationMin ?? 60) * 60_000)
    lines.push(`DTSTART:${formatUtc(start)}`)
    lines.push(`DTEND:${formatUtc(end)}`)
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`)
  if (event.notes != null && event.notes.trim() !== '') {
    lines.push(`DESCRIPTION:${escapeText(event.notes)}`)
  }
  lines.push('END:VEVENT')
  return lines
}

export function buildIcs(events: CalEvent[], options: IcsOptions): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calbud//Week export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  if (options.calendarName) lines.push(`X-WR-CALNAME:${escapeText(options.calendarName)}`)
  for (const event of events) lines.push(...eventLines(event, options))
  lines.push('END:VCALENDAR')
  return lines.flatMap(foldLine).join('\r\n') + '\r\n'
}
