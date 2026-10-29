import { describe, it, expect } from 'vitest'
import { parseProfileEdit, timeZones, zoneLabel } from './profileEdit'
import { COLORS } from './colors'

const zones = ['America/Denver', 'America/New_York', 'Europe/London']

describe('parseProfileEdit', () => {
  it('trims name and passes through color/timezone', () => {
    expect(parseProfileEdit({ name: '  Alice ', color: '#6366f1', timezone: 'America/Denver' }, zones))
      .toEqual({ ok: true, changes: { display_name: 'Alice', color: '#6366f1', timezone: 'America/Denver' } })
  })

  it('rejects empty name and too-long name; accepts 40-char name', () => {
    expect(parseProfileEdit({ name: '   ', color: '#6366f1', timezone: 'America/Denver' }, zones))
      .toEqual({ ok: false, errors: { name: 'Enter a name (up to 40 characters).' } })

    const tooLong = 'a'.repeat(41)
    expect(parseProfileEdit({ name: tooLong, color: '#6366f1', timezone: 'America/Denver' }, zones))
      .toEqual({ ok: false, errors: { name: 'Enter a name (up to 40 characters).' } })

    const forty = 'a'.repeat(40)
    expect(parseProfileEdit({ name: forty, color: '#6366f1', timezone: 'America/Denver' }, zones))
      .toEqual({ ok: true, changes: { display_name: forty, color: '#6366f1', timezone: 'America/Denver' } })
  })

  it('rejects invalid colour and timezone; collects all errors', () => {
    expect(parseProfileEdit({ name: 'Alice', color: '#123456', timezone: 'Mars/Base' }, zones))
      .toEqual({ ok: false, errors: { color: 'Pick a colour.', timezone: 'Pick a time zone.' } })

    expect(parseProfileEdit({ name: '   ', color: '#000000', timezone: 'Mars/Base' }, zones))
      .toEqual({ ok: false, errors: { name: 'Enter a name (up to 40 characters).', color: 'Pick a colour.', timezone: 'Pick a time zone.' } })

    expect(parseProfileEdit({ name: 'Alice', color: COLORS[0], timezone: 'America/Denver' }, zones))
      .toEqual({ ok: true, changes: { display_name: 'Alice', color: COLORS[0], timezone: 'America/Denver' } })
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
