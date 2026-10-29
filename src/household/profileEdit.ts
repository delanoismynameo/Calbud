import { COLORS } from './colors'

export interface ProfileInput { name: string; color: string; timezone: string }

export function parseProfileEdit(
  input: ProfileInput,
  zones: string[],
):
  | { ok: true; changes: { display_name: string; color: string; timezone: string } }
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

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, changes: { display_name: trimmed, color: input.color, timezone: input.timezone } }
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
