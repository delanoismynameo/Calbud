import { describe, it, expect } from 'vitest'
import type { Activity } from './types'
import { parseActivityForm, activityFormFrom, sortDay, visibleActivities, activityDetails } from './activities'

function act(overrides: Partial<Activity> = {}): Activity {
  return {
    user_id: 'me',
    title: 'Gym',
    scheduled_date: '2026-03-02',
    start_time: null,
    duration_min: null,
    kcal_burned: null,
    completed: false,
    notes: null,
    id: 'a1',
    created_at: '',
    ...overrides,
  }
}

describe('parseActivityForm – valid full input', () => {
  it('returns every field correctly', () => {
    const result = parseActivityForm({
      title: ' Gym ',
      date: '2026-03-02',
      startTime: '18:00',
      duration: '90',
      kcal: '300',
      notes: ' legs ',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields).toEqual({
        title: 'Gym',
        scheduled_date: '2026-03-02',
        start_time: '18:00:00',
        duration_min: 90,
        kcal_burned: 300,
        notes: 'legs',
      })
    }
  })
})

describe('parseActivityForm – all optional fields empty', () => {
  it('gives null for optional fields', () => {
    const result = parseActivityForm({
      title: 'Gym',
      date: '2026-03-02',
      startTime: '',
      duration: '',
      kcal: '',
      notes: '',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields.start_time).toBe(null)
      expect(result.fields.duration_min).toBe(null)
      expect(result.fields.kcal_burned).toBe(null)
      expect(result.fields.notes).toBe(null)
    }
  })
})

describe('parseActivityForm – invalid title', () => {
  it('empty and over 80 characters each produce an error', () => {
    const empty = parseActivityForm({ title: '', date: '2026-03-02', startTime: '', duration: '', kcal: '', notes: '' })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.errors.title).toBe('Give it a name.')

    const long = parseActivityForm({ title: 'A'.repeat(81), date: '2026-03-02', startTime: '', duration: '', kcal: '', notes: '' })
    expect(long.ok).toBe(false)
    if (!long.ok) expect(long.errors.title).toBe('Keep this under 80 characters.')
  })
})

describe('parseActivityForm – bad date', () => {
  it('gives an error for YYYY-MM-DD mismatch', () => {
    const result = parseActivityForm({ title: 'Gym', date: '2026-3-2', startTime: '', duration: '', kcal: '', notes: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.date).toBe('Pick a date.')
  })
})

describe('parseActivityForm – bad start times', () => {
  it('25:00, 18:60 and 6pm each give the same error', () => {
    for (const t of ['25:00', '18:60', '6pm']) {
      const result = parseActivityForm({ title: 'Gym', date: '2026-03-02', startTime: t, duration: '', kcal: '', notes: '' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.startTime).toBe('Use a time like 14:30.')
    }
  })
})

describe('parseActivityForm – invalid durations', () => {
  it('0, 601 and 1.5 each give error; 600 is fine', () => {
    for (const d of ['0', '601', '1.5']) {
      const result = parseActivityForm({ title: 'Gym', date: '2026-03-02', startTime: '', duration: d, kcal: '', notes: '' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.duration).toBe('Enter minutes from 1 to 600.')
    }
    const result = parseActivityForm({ title: 'Gym', date: '2026-03-02', startTime: '', duration: '600', kcal: '', notes: '' })
    expect(result.ok).toBe(true)
  })
})

describe('parseActivityForm – invalid kcal', () => {
  it('-1, 5001 and abc each give error; 0 is fine', () => {
    for (const k of ['-1', '5001', 'abc']) {
      const result = parseActivityForm({ title: 'Gym', date: '2026-03-02', startTime: '', duration: '', kcal: k, notes: '' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.kcal).toBe('Enter calories from 0 to 5000.')
    }
    const result = parseActivityForm({ title: 'Gym', date: '2026-03-02', startTime: '', duration: '', kcal: '0', notes: '' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.fields.kcal_burned).toBe(0)
  })
})

describe('parseActivityForm – multiple errors', () => {
  it('bad title and bad date together produce both errors', () => {
    const result = parseActivityForm({ title: '', date: 'bad', startTime: '', duration: '', kcal: '', notes: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.title).toBe('Give it a name.')
      expect(result.errors.date).toBe('Pick a date.')
    }
  })
})

describe('activityFormFrom', () => {
  it('converts an activity to form input and back-fills empty strings', () => {
    const full = activityFormFrom(act({ start_time: '18:00:00', duration_min: 90, kcal_burned: 300, notes: 'legs' }))
    expect(full).toEqual({ title: 'Gym', date: '2026-03-02', startTime: '18:00', duration: '90', kcal: '300', notes: 'legs' })

    const empty = activityFormFrom(act({}))
    expect(empty.startTime).toBe('')
    expect(empty.duration).toBe('')
    expect(empty.kcal).toBe('')
    expect(empty.notes).toBe('')
  })
})

describe('sortDay', () => {
  it('puts timed items first (earliest first), then no-time items in original order; does not mutate input', () => {
    const n1 = act({ id: 'n1' })
    const n2 = act({ id: 'n2' })
    const t1 = act({ id: 't1', start_time: '19:00:00' })
    const t2 = act({ id: 't2', start_time: '07:30:00' })
    const input = [n1, t1, t2, n2]
    const result = sortDay(input)
    expect(result[0]).toBe(t2)
    expect(result[1]).toBe(t1)
    expect(result[2]).toBe(n1)
    expect(result[3]).toBe(n2)
    // ensure input not mutated
    expect(input[0]).toBe(n1)
    expect(input[1]).toBe(t1)
  })
})

describe('visibleActivities', () => {
  it("filters by user_id in mine mode; keeps all in both mode", () => {
    const a1 = act()
    const a2 = act({ id: 'a2', user_id: 'you' })
    const items = [a1, a2]
    expect(visibleActivities(items, 'mine', 'me').length).toBe(1)
    expect(visibleActivities(items, 'both', 'me').length).toBe(2)
  })
})

describe('activityDetails', () => {
  it('formats the four examples and edge cases', () => {
    // full: start 18:00:00, 90 min, 300 kcal
    expect(activityDetails(act({ start_time: '18:00:00', duration_min: 90, kcal_burned: 300 }))).toBe('18:00 · 1 h 30 min · 300 cal burned')

    // no time, 45 min, no kcal
    expect(activityDetails(act({ duration_min: 45 }))).toBe('45 min')

    // nothing at all
    expect(activityDetails(act({}))).toBe('')

    // 60 min → 1 h
    expect(activityDetails(act({ duration_min: 60 }))).toBe('1 h')

    // 120 min → 2 h
    expect(activityDetails(act({ duration_min: 120 }))).toBe('2 h')
  })
})
