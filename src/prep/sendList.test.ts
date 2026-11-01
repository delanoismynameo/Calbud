import { describe, it, expect } from 'vitest'
import { groceryText, sendText, isKeepLink, copyAndOpen } from './sendList'

const items = [
  { name: 'eggs', qty: 6, unit: '' },
  { name: 'rice', qty: 2, unit: 'cup' },
  { name: 'salt', qty: null, unit: '' },
]

describe('groceryText', () => {
  it('returns all items when none are ticked', () => {
    expect(groceryText(items, new Set())).toBe('6 eggs\n2 cup rice\nsalt')
  })

  it('excludes ticked items', () => {
    expect(groceryText(items, new Set(['rice|cup|q']))).toBe('6 eggs\nsalt')
  })

  it('returns empty string when all are ticked', () => {
    expect(groceryText(items, new Set(['eggs||q', 'rice|cup|q', 'salt||n']))).toBe('')
  })
})

describe('sendText', () => {
  it('calls share and returns shared when share succeeds', async () => {
    const callData: { text: string }[] = []
    const nav = {
      share: (data: { text: string }) => { callData.push(data); return Promise.resolve() },
    }
    const result = await sendText('x', nav)
    expect(result).toBe('shared')
    expect(callData.length).toBe(1)
    expect(callData[0]).toEqual({ text: 'x' })
  })

  it('returns cancelled when share throws AbortError', async () => {
    const nav = {
      share: () => { throw new DOMException('Aborted', 'AbortError') },
    }
    const result = await sendText('x', nav)
    expect(result).toBe('cancelled')
  })

  it('rethrows non-AbortError from share', async () => {
    const nav = {
      share: () => Promise.reject(new Error('boom')),
    }
    await expect(sendText('x', nav)).rejects.toThrow('boom')
  })

  it('uses clipboard when share is absent', async () => {
    let captured = ''
    const cliphook = { writeText(t: string) { captured = t; return Promise.resolve() } }
    const nav = { clipboard: cliphook }
    const result = await sendText('x', nav as never)
    expect(result).toBe('copied')
    expect(captured).toBe('x')
  })

  it('prefers share over clipboard when both exist', async () => {
    const callData: string[] = []
    const nav = {
      share: (data: { text: string }) => { callData.push(data.text); return Promise.resolve() },
      clipboard: { writeText: (t: string) => { return Promise.resolve() } },
    }
    await sendText('x', nav as never)
    expect(callData).toEqual(['x'])
  })

  it('throws when neither share nor clipboard exists', async () => {
    await expect(sendText('x', {} as never)).rejects.toThrow(
      'This browser can neither share nor copy.'
    )
  })
})

describe('isKeepLink', () => {
  it('returns true for valid keep.google.com URL with LIST', () => {
    expect(isKeepLink('https://keep.google.com/u/0/#LIST/1abc')).toBe(true)
  })

  it('returns true for valid keep.google.com URL with NOTE and whitespace', () => {
    expect(isKeepLink('  https://keep.google.com/#NOTE/xyz  ')).toBe(true)
  })

  it('returns false for http instead of https', () => {
    expect(isKeepLink('http://keep.google.com/#LIST/1abc')).toBe(false)
  })

  it('returns false for evil domain', () => {
    expect(isKeepLink('https://keep.google.com.evil.com/#LIST/1')).toBe(false)
  })

  it('returns false for URL without protocol', () => {
    expect(isKeepLink('keep.google.com/#LIST/1abc')).toBe(false)
  })

  it('returns false for URL with space in path', () => {
    expect(isKeepLink('https://keep.google.com/#LIST/1 abc')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isKeepLink('')).toBe(false)
  })
})

describe('copyAndOpen', () => {
  it('copies text and opens URL when clipboard exists', async () => {
    const events: string[] = []
    const clipboard = { writeText: (t: string) => { events.push('copy:' + t); return Promise.resolve() } }
    const nav = { clipboard }
    const open = (url: string) => { events.push('open:' + url) }
    const result = await copyAndOpen('milk', 'https://keep.google.com/#LIST/1', nav, open)
    expect(result).toBe('copied')
    expect(events).toEqual(['copy:milk', 'open:https://keep.google.com/#LIST/1'])
  })

  it('throws when clipboard does not exist', async () => {
    const events: string[] = []
    const nav = {}
    const open = (url: string) => { events.push('open:' + url) }
    await expect(copyAndOpen('milk', 'https://keep.google.com/#LIST/1', nav, open)).rejects.toThrow('This browser cannot copy.')
    expect(events).toEqual([])
  })

  it('throws when writeText rejects', async () => {
    const events: string[] = []
    const clipboard = { writeText: () => Promise.reject(new Error('denied')) }
    const nav = { clipboard }
    const open = (url: string) => { events.push('open:' + url) }
    await expect(copyAndOpen('milk', 'https://keep.google.com/#LIST/1', nav, open)).rejects.toThrow('denied')
    expect(events).toEqual([])
  })
})
