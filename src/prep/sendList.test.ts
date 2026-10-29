import { describe, it, expect } from 'vitest'
import { groceryText, sendText } from './sendList'

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
