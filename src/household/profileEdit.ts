import { COLORS } from './colors'

export interface ProfileInput { 
  name: string 
  color: string 
  timezone: string
  reminder_time: string | null  // Time in HH:MM:SS format or null for no reminder
}

export function parseProfileEdit(
  input: ProfileInput,
  zones: string[],
):
  | { ok: true; changes: { display_name: string; color: string; timezone: string; reminder_time: string | null } }
  | { ok: false; errors: Partial<Record<keyof ProfileInput, string>> } {
  const trimmed = input.name.trim()
  const errors: Partial<Record<keyof ProfileInput, string>> = {}

  if (trimmed.length < 1 || trimmed.length > 40) {
    errors.name = 'Enter a name (up to 40 characters).'
  }

  if (!COLORS.includes(input.color)) {
    errors.color = 'Pick a colour.'
  }

  if (!zones.includes(input.timezone)) {
    errors.timezone = 'Pick a time zone.'
  }

  // Validate reminder_time if provided
  if (input.reminder_time !== null && input.reminder_time !== '') {
    const parsed = parseTime(input.reminder_time)
    if (!parsed) {
      errors.reminder_time = 'Enter a valid time (HH:MM format).'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  // Convert to HH:MM:SS format for storage
  const storedTime = parseTime(input.reminder_time)

  return { 
    ok: true, 
    changes: { 
      display_name: trimmed, 
      color: input.color, 
      timezone: input.timezone,
      reminder_time: storedTime
    } 
  }
}

export function timeZones(supported: string[], current: string): string[] {
  const merged = [...supported]
  if (!merged.includes(current)) {
    merged.push(current)
  }
  return merged.sort()
}

export function zoneLabel(zone: string): string {
  return zone.replace(/\//g, ' / ').replace(/_/g, ' ')
}

/**
 * Validate if a string is a valid time in HH:MM or HH:MM:SS format
 */
export function isValidTime(timeStr: string): boolean {
  if (!timeStr) return false
  // Accept both HH:MM and HH:MM:SS formats
  return /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(timeStr)
}

/**
 * Parse a time string (HH:MM or HH:MM:SS) and return HH:MM:SS format
 */
export function parseTime(timeStr: string | null): string | null {
  if (!timeStr) return null
  const parts = timeStr.split(':')
  if (parts.length < 2) return null
  
  const [h, m, s = '00'] = parts
  const hours = Number(h)
  const minutes = Number(m)
  const seconds = Number(s)
  
  // Validate ranges
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null
  }
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Format a time string (HH:MM:SS) for display in 12-hour format
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return ''
  const [hours, minutes, ss = '00'] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * Get default meal times based on normal meal patterns
 */
export function getDefaultMealTimes(): { breakfast: string; lunch: string; dinner: string; snack: string } {
  return {
    breakfast: '07:30:00',
    lunch: '12:30:00',
    dinner: '18:00:00',
    snack: '22:00:00',
  }
}