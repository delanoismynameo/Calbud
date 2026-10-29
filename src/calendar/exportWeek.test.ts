import { describe, it, expect, vi } from 'vitest'
import type { Activity } from '../activities/types'
import type { CalEvent } from './ics'
import { activityEvents, exportFileName, isIosStandalone, deliverIcs } from './exportWeek'

interface ShareNavMock {
  canShare?: (data: { files: File[] }) => boolean
  share?: (data: { files: File[]; title: string }) => Promise<void>
}

function act(overrides: Partial<Activity> = {}): Activity {
  return {
    user_id: 'me',
    id: 'a1',
    title: 'Gym',
    scheduled_date: '2026-10-27',
    start_time: null,
    duration_min: null,
    kcal_burned: null,
    completed: false,
    notes: null,
    created_at: '',
    ...overrides,
  }
}

function makeFile(): File {
  try {
    return new File(['x'], 'a.ics', { type: 'text/calendar' }) as File
  } catch {
    return {} as unknown as File
  }
}

describe('activityEvents', () => {
  it('maps a timed activity correctly', () => {
    const result = activityEvents(
      [act({ start_time: '18:00:00', duration_min: 90, notes: 'legs' })],
      {},
      false,
    )
    expect(result).toEqual([
      { uid: 'activity-a1', title: 'Gym', date: '2026-10-27', startTime: '18:00:00', durationMin: 90, notes: 'legs' } as CalEvent,
    ])
  })

  it('untimed activity gives nulls and keeps notes null', () => {
    const result = activityEvents([act()], {}, false)
    expect(result[0].startTime).toBeNull()
    expect(result[0].durationMin).toBeNull()
    expect(result[0].notes).toBeNull()
  })

  it('prefixNames with names adds display name prefix', () => {
    const result = activityEvents([act()], { me: 'Alice' }, true)
    expect(result[0].title).toBe('Alice: Gym')
  })

  it('prefixNames false keeps original title', () => {
    const result = activityEvents([act()], { me: 'Alice' }, false)
    expect(result[0].title).toBe('Gym')
  })

  it('prefixNames true but user not in names keeps title', () => {
    const result = activityEvents([act({ user_id: 'unknown' })], { me: 'Alice' }, true)
    expect(result[0].title).toBe('Gym')
  })

  it('schedules activities in correct order', () => {
    const items = [
      act({ id: 'n', scheduled_date: '2026-10-28', start_time: null }),
      act({ id: 'b', scheduled_date: '2026-10-27', start_time: '19:00:00' }),
      act({ id: 'a', scheduled_date: '2026-10-27', start_time: '07:30:00' }),
      act({ id: 'c', scheduled_date: '2026-10-27', start_time: null }),
    ]
    const result = activityEvents(items, {}, false)
    expect(result.map((e) => e.uid)).toEqual([
      'activity-a',
      'activity-b',
      'activity-c',
      'activity-n',
    ])
    // Input is not mutated
    expect(items[0].id).toBe('n')
  })

  it('empty array returns empty array', () => {
    const result = activityEvents([], {}, false)
    expect(result).toEqual([])
  })
})

describe('exportFileName', () => {
  it('produces the correct filename for a given week start', () => {
    expect(exportFileName('2026-10-25')).toBe('calbud-2026-10-25.ics')
  })
})

describe('isIosStandalone', () => {
  it('iPhone with standalone true returns true', () => {
    expect(isIosStandalone('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5, true)).toBe(true)
  })

  it('iPhone with standalone false returns false', () => {
    expect(isIosStandalone('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5, false)).toBe(false)
  })

  it('iPad Macintosh with maxTouchPoints > 1 and standalone true returns true', () => {
    expect(isIosStandalone('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5, true)).toBe(true)
  })

  it('real Mac with maxTouchPoints 0 returns false', () => {
    expect(isIosStandalone('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0, true)).toBe(false)
  })

  it('Android returns false', () => {
    expect(isIosStandalone('Mozilla/5.0 (Linux; Android 14)', 5, true)).toBe(false)
  })
})

describe('deliverIcs', () => {
  it('preferShare false calls download and returns downloaded', async () => {
    const file = makeFile()
    let called = false
    const download = (f: File) => { called = true }
    const nav: ShareNavMock = { canShare: () => true, share: async () => {} }
    const result = await deliverIcs(file, false, nav, download)
    expect(called).toBe(true)
    expect(result).toBe('downloaded')
  })

  it('preferShare true with working share calls share and returns shared', async () => {
    const file = makeFile()
    let shareCalled = false
    const share: ShareNavMock['share'] = async () => { shareCalled = true }
    const nav: ShareNavMock = { canShare: () => true, share }
    const download = vi.fn()
    const result = await deliverIcs(file, true, nav, download)
    expect(shareCalled).toBe(true)
    expect(download).not.toHaveBeenCalled()
    expect(result).toBe('shared')
  })

  it('share rejects with AbortError returns cancelled without download', async () => {
    const file = makeFile()
    class AbortError extends Error { name = 'AbortError' }
    let shareCalled = false
    const share: ShareNavMock['share'] = async () => { shareCalled = true; throw new AbortError() }
    const nav: ShareNavMock = { canShare: () => true, share }
    let downloadCalled = false
    const download = (f: File) => { downloadCalled = true }
    const result = await deliverIcs(file, true, nav, download)
    expect(shareCalled).toBe(true)
    expect(downloadCalled).toBe(false)
    expect(result).toBe('cancelled')
  })

  it('share rejects with other error falls back to download', async () => {
    const file = makeFile()
    let shareCalled = false
    const share: ShareNavMock['share'] = async () => { shareCalled = true; throw new Error('boom') }
    const nav: ShareNavMock = { canShare: () => true, share }
    let downloadCalled = false
    const download = (f: File) => { downloadCalled = true }
    const result = await deliverIcs(file, true, nav, download)
    expect(shareCalled).toBe(true)
    expect(downloadCalled).toBe(true)
    expect(result).toBe('downloaded')
  })

  it('preferShare true but nav is empty calls download', async () => {
    const file = makeFile()
    let downloadCalled = false
    const download = (f: File) => { downloadCalled = true }
    const result = await deliverIcs(file, true, {}, download)
    expect(downloadCalled).toBe(true)
    expect(result).toBe('downloaded')
  })

  it('preferShare true but canShare returns false calls download', async () => {
    const file = makeFile()
    let downloadCalled = false
    const download = (f: File) => { downloadCalled = true }
    const nav: ShareNavMock = { canShare: () => false }
    const result = await deliverIcs(file, true, nav, download)
    expect(downloadCalled).toBe(true)
    expect(result).toBe('downloaded')
  })
})
