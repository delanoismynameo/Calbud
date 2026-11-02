import { describe, it, expect } from 'vitest'
import { toGoogleCalendarUrl } from './googleCalendar'
import type { CalEvent } from './ics'

const TIME_ZONE = 'America/New_York'

function timedEvent(overrides: Partial<CalEvent> = {}): CalEvent {
  return {
    uid: 'test-1',
    title: 'Workout',
    date: '2026-01-15',
    startTime: '17:00',
    durationMin: 60,
    notes: null,
    ...overrides,
  }
}

function allDayEvent(overrides: Partial<CalEvent> = {}): CalEvent {
  return {
    uid: 'test-2',
    title: 'Rest day',
    date: '2026-01-15',
    startTime: null,
    durationMin: null,
    notes: null,
    ...overrides,
  }
}

describe('toGoogleCalendarUrl', () => {
  describe('timed events', () => {
    it('builds correct URL for a timed event', () => {
      const event = timedEvent({ title: 'Morning Run', date: '2026-01-15', startTime: '07:00', durationMin: 30 })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      expect(url).toContain('action=TEMPLATE')
      expect(url).toContain('text=Morning%20Run')
      expect(url).toContain('dates=20260115T070000/20260115T073000')
      expect(url).toContain('ctz=America%2FNew_York')
    })

    it('uses default 60-minute duration when durationMin is null', () => {
      const event = timedEvent({ startTime: '18:00', durationMin: null })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      expect(url).toContain('dates=20260115T180000/20260115T190000')
    })

    it('handles events that cross midnight', () => {
      const event = timedEvent({ date: '2026-01-15', startTime: '23:00', durationMin: 120 })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // Start: 2026-01-15T23:00:00, End: 2026-01-16T01:00:00
      expect(url).toContain('dates=20260115T230000/20260116T010000')
    })

    it('handles month rollover correctly', () => {
      const event = timedEvent({ date: '2026-01-31', startTime: '23:00', durationMin: 90 })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // Start: 2026-01-31T23:00:00, End: 2026-02-01T00:30:00
      expect(url).toContain('dates=20260131T230000/20260201T003000')
    })

    it('handles year rollover correctly', () => {
      const event = timedEvent({ date: '2025-12-31', startTime: '23:30', durationMin: 60 })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // Start: 2025-12-31T23:30:00, End: 2026-01-01T00:30:00
      expect(url).toContain('dates=20251231T233000/20260101T003000')
    })

    it('URL encodes special characters in title', () => {
      const event = timedEvent({ title: 'Morning Run (30min)' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // encodeURIComponent encodes spaces as %20 and comma as %2C, but not parentheses or exclamation
      expect(url).toContain('text=Morning%20Run%20(30min)')
    })

    it('URL encodes special characters in notes', () => {
      const event = timedEvent({ notes: 'Workout at 7am, bring water!' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // encodeURIComponent encodes comma as %2C but not exclamation mark
      expect(url).toContain('details=Workout%20at%207am%2C%20bring%20water!')
    })

    it('includes notes in URL when present', () => {
      const event = timedEvent({ notes: 'Bring your water bottle' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      expect(url).toContain('details=Bring%20your%20water%20bottle')
    })

    it('does not include details param when notes is null', () => {
      const event = timedEvent({ notes: null })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // The URL should end with &ctz when there are no notes
      expect(url).toMatch(/&ctz=America%2FNew_York$/)
    })

    it('does not include details param when notes is empty string', () => {
      const event = timedEvent({ notes: '' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      expect(url).toMatch(/&ctz=America%2FNew_York$/)
    })

    it('does not include details param when notes is only whitespace', () => {
      const event = timedEvent({ notes: '   ' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      expect(url).toMatch(/&ctz=America%2FNew_York$/)
    })
  })

  describe('all-day events', () => {
    it('builds correct URL for an all-day event', () => {
      const event = allDayEvent({ title: 'Rest Day' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      expect(url).toContain('text=Rest%20Day')
      // All-day: start date, end is next day
      expect(url).toContain('dates=20260115/20260116')
      expect(url).toContain('ctz=America%2FNew_York')
    })

    it('calculates correct end date for all-day events', () => {
      const event = allDayEvent({ date: '2026-02-28' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // End date should be 2026-03-01 (next day, month rollover)
      expect(url).toContain('dates=20260228/20260301')
    })

    it('handles year end for all-day events', () => {
      const event = allDayEvent({ date: '2025-12-31' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // End date should be 2026-01-01
      expect(url).toContain('dates=20251231/20260101')
    })

    it('URL encodes special characters in all-day event title', () => {
      const event = allDayEvent({ title: 'Day off & relax' })
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      // encodeURIComponent encodes spaces as %20 and & as %26
      expect(url).toContain('text=Day%20off%20%26%20relax')
    })
  })

  describe('URL formatting', () => {
    it('returns a valid URL string', () => {
      const event = timedEvent()
      const url = toGoogleCalendarUrl(event, TIME_ZONE)
      
      expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE')
    })

    it('properly encodes all parameters', () => {
      const event = timedEvent({ 
        title: 'Test Event', 
        date: '2026-06-15', 
        startTime: '09:30', 
        durationMin: 45,
        notes: 'Note with spaces & special chars!'
      })
      const url = toGoogleCalendarUrl(event, 'Europe/London')
      
      expect(url).toContain('text=Test%20Event')
      expect(url).toContain('dates=20260615T093000/20260615T101500')
      // & is encoded, ! is not
      expect(url).toContain('details=Note%20with%20spaces%20%26%20special%20chars!')
      expect(url).toContain('ctz=Europe%2FLondon')
    })

    it('properly encodes time zone with special characters', () => {
      const event = timedEvent()
      const url = toGoogleCalendarUrl(event, 'America/New_York')
      
      expect(url).toContain('ctz=America%2FNew_York')
    })
  })
})
describe('toGoogleCalendarUrl midnight end', () => {
  it('ends on the next day when the event finishes exactly at midnight', () => {
    const url = toGoogleCalendarUrl({ uid: 'u', title: 'Late', date: '2026-11-02', startTime: '23:00', durationMin: 60, notes: null } as never, 'America/Chicago')
    expect(url).toContain('dates=20261102T230000/20261103T000000')
  })
})
