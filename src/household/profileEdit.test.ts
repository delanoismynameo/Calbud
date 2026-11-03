import { describe, it, expect } from 'vitest'
import { 
  parseProfileEdit, 
  timeZones, 
  zoneLabel, 
  isValidTime, 
  parseTime, 
  formatTimeDisplay,
  getDefaultMealTimes 
} from './profileEdit'
import { COLORS } from './colors'

const zones = ['America/Denver', 'America/New_York', 'Europe/London']

describe('parseProfileEdit', () => {
  it('trims name and passes through color/timezone/reminder_time', () => {
    expect(parseProfileEdit({ 
      name: '  Alice ', 
      color: '#6366f1', 
      timezone: 'America/Denver',
      reminder_time: '07:30:00'
    }, zones))
      .toEqual({ 
        ok: true, 
        changes: { 
          display_name: 'Alice', 
          color: '#6366f1', 
          timezone: 'America/Denver',
          reminder_time: '07:30:00'
        } 
      })
  })

  it('handles null reminder_time correctly', () => {
    expect(parseProfileEdit({ 
      name: 'Bob', 
      color: COLORS[0], 
      timezone: 'America/Denver',
      reminder_time: null
    }, zones))
      .toEqual({ 
        ok: true, 
        changes: { 
          display_name: 'Bob', 
          color: COLORS[0], 
          timezone: 'America/Denver',
          reminder_time: null
        } 
      })
  })

  it('rejects empty name and too-long name; accepts 40-char name', () => {
    expect(parseProfileEdit({ 
      name: '   ', 
      color: '#6366f1', 
      timezone: 'America/Denver',
      reminder_time: null
    }, zones))
      .toEqual({ ok: false, errors: { name: 'Enter a name (up to 40 characters).' } })

    const tooLong = 'a'.repeat(41)
    expect(parseProfileEdit({ 
      name: tooLong, 
      color: '#6366f1', 
      timezone: 'America/Denver',
      reminder_time: null
    }, zones))
      .toEqual({ ok: false, errors: { name: 'Enter a name (up to 40 characters).' } })

    const forty = 'a'.repeat(40)
    expect(parseProfileEdit({ 
      name: forty, 
      color: '#6366f1', 
      timezone: 'America/Denver',
      reminder_time: null
    }, zones))
      .toEqual({ ok: true, changes: { 
        display_name: forty, 
        color: '#6366f1', 
        timezone: 'America/Denver',
        reminder_time: null
      } })
  })

  it('rejects invalid colour and timezone; collects all errors', () => {
    expect(parseProfileEdit({ 
      name: 'Alice', 
      color: '#123456', 
      timezone: 'Mars/Base',
      reminder_time: null
    }, zones))
      .toEqual({ ok: false, errors: { color: 'Pick a colour.', timezone: 'Pick a time zone.' } })

    expect(parseProfileEdit({ 
      name: '   ', 
      color: '#000000', 
      timezone: 'Mars/Base',
      reminder_time: null
    }, zones))
      .toEqual({ ok: false, errors: { 
        name: 'Enter a name (up to 40 characters).', 
        color: 'Pick a colour.', 
        timezone: 'Pick a time zone.' 
      } })

    expect(parseProfileEdit({ 
      name: 'Alice', 
      color: COLORS[0], 
      timezone: 'America/Denver',
      reminder_time: '07:30:00'
    }, zones))
      .toEqual({ ok: true, changes: { 
        display_name: 'Alice', 
        color: COLORS[0], 
        timezone: 'America/Denver',
        reminder_time: '07:30:00'
      } })
  })

  it('rejects invalid reminder_time format', () => {
    expect(parseProfileEdit({ 
      name: 'Alice', 
      color: COLORS[0], 
      timezone: 'America/Denver',
      reminder_time: '25:00'  // Invalid hour
    }, zones))
      .toEqual({ ok: false, errors: { reminder_time: 'Enter a valid time (HH:MM format).' } })

    expect(parseProfileEdit({ 
      name: 'Alice', 
      color: COLORS[0], 
      timezone: 'America/Denver',
      reminder_time: '12:60'  // Invalid minute
    }, zones))
      .toEqual({ ok: false, errors: { reminder_time: 'Enter a valid time (HH:MM format).' } })
  })

  it('accepts valid reminder_time formats', () => {
    expect(parseProfileEdit({ 
      name: 'Alice', 
      color: COLORS[0], 
      timezone: 'America/Denver',
      reminder_time: '00:00:00'  // Midnight
    }, zones)).toEqual({ ok: true, changes: { 
      display_name: 'Alice', 
      color: COLORS[0], 
      timezone: 'America/Denver',
      reminder_time: '00:00:00'
    } })

    expect(parseProfileEdit({ 
      name: 'Alice', 
      color: COLORS[0], 
      timezone: 'America/Denver',
      reminder_time: '23:59:00'  // End of day
    }, zones)).toEqual({ ok: true, changes: { 
      display_name: 'Alice', 
      color: COLORS[0], 
      timezone: 'America/Denver',
      reminder_time: '23:59:00'
    } })
  })

  it('returns correct merged and sorted time zones without mutating input', () => {
    expect(timeZones(['Europe/London', 'America/Denver'], 'America/Denver'))
      .toEqual(['America/Denver', 'Europe/London'])

    expect(timeZones(['Europe/London'], 'Asia/Tokyo'))
      .toEqual(['Asia/Tokyo', 'Europe/London'])

    const supported = ['Europe/London']
    timeZones(supported, 'Asia/Tokyo')
    expect(supported).toEqual(['Europe/London'])
  })

  it('transforms zone to readable label', () => {
    expect(zoneLabel('America/New_York')).toBe('America / New York')
    expect(zoneLabel('America/Argentina/Buenos_Aires')).toBe('America / Argentina / Buenos Aires')
    expect(zoneLabel('UTC')).toBe('UTC')
  })
})

describe('isValidTime', () => {
  it('returns true for valid times', () => {
    expect(isValidTime('00:00:00')).toBe(true)
    expect(isValidTime('07:30:00')).toBe(true)
    expect(isValidTime('12:00:00')).toBe(true)
    expect(isValidTime('23:59:59')).toBe(true)
  })

  it('returns false for invalid times', () => {
    expect(isValidTime('24:00:00')).toBe(false)  // Invalid hour
    expect(isValidTime('12:60:00')).toBe(false)  // Invalid minute
    expect(isValidTime('12:00:60')).toBe(false)  // Invalid second
    expect(isValidTime('1:00:00')).toBe(false)   // Missing leading zero
    expect(isValidTime('')).toBe(false)          // Empty string
  })

  it('returns false for null or empty', () => {
    expect(isValidTime('') as boolean).toBe(false)
  })
})

describe('parseTime', () => {
  it('parses HH:MM:SS format', () => {
    expect(parseTime('07:30:00')).toBe('07:30:00')
    expect(parseTime('12:00:00')).toBe('12:00:00')
  })

  it('parses HH:MM format and adds seconds', () => {
    expect(parseTime('07:30')).toBe('07:30:00')
    expect(parseTime('12:00')).toBe('12:00:00')
  })

  it('returns null for invalid input', () => {
    expect(parseTime(null)).toBe(null)
    expect(parseTime('')).toBe(null)
    expect(parseTime('invalid')).toBe(null)
  })

  it('pads single digits', () => {
    expect(parseTime('7:5:3')).toBe('07:05:03')
  })
})

describe('formatTimeDisplay', () => {
  it('formats time in 12-hour format with AM', () => {
    expect(formatTimeDisplay('07:30:00')).toBe('7:30 AM')
    expect(formatTimeDisplay('09:00:00')).toBe('9:00 AM')
  })

  it('formats time in 12-hour format with PM', () => {
    expect(formatTimeDisplay('13:30:00')).toBe('1:30 PM')
    expect(formatTimeDisplay('18:00:00')).toBe('6:00 PM')
  })

  it('handles midnight correctly', () => {
    expect(formatTimeDisplay('00:00:00')).toBe('12:00 AM')
    expect(formatTimeDisplay('00:30:00')).toBe('12:30 AM')
  })

  it('handles noon correctly', () => {
    expect(formatTimeDisplay('12:00:00')).toBe('12:00 PM')
  })
})

describe('getDefaultMealTimes', () => {
  it('returns default meal times', () => {
    const times = getDefaultMealTimes()
    expect(times.breakfast).toBe('07:30:00')
    expect(times.lunch).toBe('12:30:00')
    expect(times.dinner).toBe('18:00:00')
    expect(times.snack).toBe('22:00:00')
  })
})