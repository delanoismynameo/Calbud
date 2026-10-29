import { describe, it, expect } from 'vitest'
import { buildIcs, localToUtc, type CalEvent } from './ics'

const NOW = new Date('2026-01-10T12:00:00Z')
const OPTS = { timeZone: 'America/New_York', now: NOW }

describe('localToUtc', () => {
  it('EST winter: 17:00 local is 22:00Z', () => {
    expect(localToUtc('2026-01-15', '17:00', 'America/New_York').toISOString()).toBe('2026-01-15T22:00:00.000Z')
  })

  it('EDT summer: 17:00 local is 21:00Z', () => {
    expect(localToUtc('2026-07-15', '17:00', 'America/New_York').toISOString()).toBe('2026-07-15T21:00:00.000Z')
  })

  it('spring-forward day, after the change: 09:00 local is 13:00Z', () => {
    expect(localToUtc('2026-03-08', '09:00', 'America/New_York').toISOString()).toBe('2026-03-08T13:00:00.000Z')
  })

  it('fall-back day, after the change: 09:00 local is 14:00Z', () => {
    expect(localToUtc('2026-11-01', '09:00', 'America/New_York').toISOString()).toBe('2026-11-01T14:00:00.000Z')
  })

  it('spring-forward gap: 02:30 uses the offset from before the change, 07:30Z', () => {
    expect(localToUtc('2026-03-08', '02:30', 'America/New_York').toISOString()).toBe('2026-03-08T07:30:00.000Z')
  })

  it('fall-back repeated hour: 01:30 is the first (daylight) occurrence, 05:30Z', () => {
    expect(localToUtc('2026-11-01', '01:30', 'America/New_York').toISOString()).toBe('2026-11-01T05:30:00.000Z')
  })

  it('Asia/Kolkata +5:30: 08:00 local is 02:30Z', () => {
    expect(localToUtc('2026-01-15', '08:00', 'Asia/Kolkata').toISOString()).toBe('2026-01-15T02:30:00.000Z')
  })

  it('crosses into the next UTC day: LA 23:30 local is 07:30Z the next day', () => {
    expect(localToUtc('2026-01-15', '23:30', 'America/Los_Angeles').toISOString()).toBe('2026-01-16T07:30:00.000Z')
  })

  it('seconds are kept: 17:00:30 UTC stays 17:00:30Z', () => {
    expect(localToUtc('2026-01-15', '17:00:30', 'UTC').toISOString()).toBe('2026-01-15T17:00:30.000Z')
  })

  it('invalid date, time, or time zone each throw a message starting with "Invalid"', () => {
    expect(() => localToUtc('2026-13-40', '17:00', 'UTC')).toThrow(/^Invalid/)
    expect(() => localToUtc('2026-01-15', '25:00', 'UTC')).toThrow(/^Invalid/)
    expect(() => localToUtc('2026-01-15', '17:00', 'Not/AZone')).toThrow(/^Invalid/)
  })
})

describe('buildIcs', () => {
  const ev = (over: Partial<CalEvent> = {}): CalEvent => ({
    uid: 'e',
    title: 'Event',
    date: '2026-01-15',
    startTime: null,
    durationMin: null,
    ...over,
  })

  const eventBlock = (out: string): string[] => {
    const lines = out.split('\r\n')
    const begin = lines.indexOf('BEGIN:VEVENT')
    const end = lines.indexOf('END:VEVENT', begin + 1)
    return lines.slice(begin + 1, end)
  }

  it('no events and no name: exact wrapper output', () => {
    expect(buildIcs([], OPTS)).toBe(
      'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Calbud//Week export//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR\r\n',
    )
  })

  it('calendarName puts X-WR-CALNAME right after METHOD:PUBLISH', () => {
    const lines = buildIcs([], { ...OPTS, calendarName: 'Calbud' }).split('\r\n')
    const i = lines.indexOf('METHOD:PUBLISH')
    expect(lines[i + 1]).toBe('X-WR-CALNAME:Calbud')
  })

  it('timed event: exact lines between BEGIN:VEVENT and END:VEVENT', () => {
    const out = buildIcs([ev({ uid: 'prep-1', title: 'Meal prep', startTime: '17:00', durationMin: 90 })], OPTS)
    expect(eventBlock(out)).toEqual([
      'UID:prep-1@calbud',
      'DTSTAMP:20260110T120000Z',
      'DTSTART:20260115T220000Z',
      'DTEND:20260115T233000Z',
      'SUMMARY:Meal prep',
    ])
  })

  it('durationMin null means a 60-minute event', () => {
    const out = buildIcs([ev({ uid: 'prep-1', title: 'Meal prep', startTime: '17:00', durationMin: null })], OPTS)
    expect(eventBlock(out)).toContain('DTEND:20260115T230000Z')
  })

  it('all-day event: DATE values, end is the next day', () => {
    const block = eventBlock(buildIcs([ev({ date: '2026-01-15', startTime: null })], OPTS))
    expect(block).toContain('DTSTART;VALUE=DATE:20260115')
    expect(block).toContain('DTEND;VALUE=DATE:20260116')
  })

  it('all-day month and year ends roll over (2026 is not a leap year)', () => {
    const cases: Array<[string, string]> = [
      ['2026-01-31', '20260201'],
      ['2026-12-31', '20270101'],
      ['2026-02-28', '20260301'],
    ]
    for (const [date, end] of cases) {
      const block = eventBlock(buildIcs([ev({ date, startTime: null })], OPTS))
      expect(block).toContain(`DTSTART;VALUE=DATE:${date.replaceAll('-', '')}`)
      expect(block).toContain(`DTEND;VALUE=DATE:${end}`)
    }
  })

  it('notes: spaces only give no DESCRIPTION, text does', () => {
    expect(buildIcs([ev({ notes: '  ' })], OPTS)).not.toContain('DESCRIPTION')
    expect(buildIcs([ev({ notes: 'Buy rice' })], OPTS)).toContain('DESCRIPTION:Buy rice')
  })

  it('escaping: backslash first, then semicolon, comma, newline', () => {
    const out = buildIcs([ev({ title: 'a,b;c\\d', notes: 'one\ntwo' })], OPTS)
    expect(out).toContain('SUMMARY:a\\,b\\;c\\\\d')
    expect(out).toContain('DESCRIPTION:one\\ntwo')
  })

  it('folding (ASCII): 200-char title, lines ≤ 75 bytes, unfolding restores it', () => {
    const title = 'x'.repeat(200)
    const out = buildIcs([ev({ title, startTime: '17:00' })], OPTS)
    for (const line of out.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75)
    }
    expect(out.replace(/\r\n /g, '')).toContain('SUMMARY:' + title)
  })

  it('folding (multi-byte): 60 é, lines ≤ 75 bytes, no split inside a character', () => {
    const title = '\u00e9'.repeat(60)
    const out = buildIcs([ev({ title, startTime: '17:00' })], OPTS)
    for (const line of out.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75)
      expect(Buffer.from(line, 'utf8').toString('utf8')).toBe(line)
    }
    expect(out.replace(/\r\n /g, '')).toContain('SUMMARY:' + title)
  })

  it('two events keep their order, each with its own UID', () => {
    const out = buildIcs([ev({ uid: 'a', title: 'First' }), ev({ uid: 'b', title: 'Second' })], OPTS)
    const ia = out.indexOf('UID:a@calbud')
    const ib = out.indexOf('UID:b@calbud')
    expect(ia).not.toBe(-1)
    expect(ib).not.toBe(-1)
    expect(ia).toBeLessThan(ib)
    expect(out.indexOf('SUMMARY:First')).toBeLessThan(out.indexOf('SUMMARY:Second'))
  })

  it('invalid time zone with a timed event throws a message starting with "Invalid"', () => {
    expect(() =>
      buildIcs([ev({ uid: 'x', title: 't', startTime: '17:00' })], { timeZone: 'Not/AZone', now: NOW }),
    ).toThrow(/^Invalid/)
  })
})
