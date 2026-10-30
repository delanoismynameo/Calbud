import { useState, useEffect, useCallback } from 'react'
import { groceryList, formatGroceryItem, groceryKey } from './grocery'
import type { GroceryItem } from './grocery'
import type { MealPrep } from './types'
import { sendText, groceryText, type SendNav } from './sendList'
import { loadExtras, mergeExtras, removeExtra, saveExtras } from './extras'
import { parseIngredients } from './ingredients'

export default function GroceryList({ sessions, weekStart }: { sessions: MealPrep[]; weekStart: string }) {
  const plannedLists = sessions.filter(s => s.status === 'planned').map(s => s.ingredients)
  const items = groceryList(plannedLists)
  const [extras, setExtras] = useState<GroceryItem[]>(() => loadExtras(weekStart))
  const allItems = groceryList([...plannedLists, extras])
  const [ticked, setTicked] = useState<Set<string>>(() => loadTicks(weekStart))
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'asking'>('idle')
  const [how, setHow] = useState<'shared' | 'copied'>('shared')
  const [sendError, setSendError] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')

  useEffect(() => {
    // Re-read from storage when weekStart changes
    setTicked(loadTicks(weekStart))
    setExtras(loadExtras(weekStart))
    setSendState('idle')
    setSendError(null)
  }, [weekStart])

  const toggle = useCallback((key: string) => {
    setTicked(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      saveTicks(weekStart, next)
      return next
    })
  }, [weekStart])

  const clear = useCallback(() => {
    setTicked(prev => {
      if (prev.size === 0) return prev
      saveTicks(weekStart, new Set())
      return new Set()
    })
  }, [weekStart])

  const plannedCount = sessions.filter(s => s.status === 'planned').length

  return (
    <div className="px-3 mt-4 pb-4">
      <h2 className="text-base font-semibold mb-1 pt-2 border-b border-line text-ink">
        Grocery list
      </h2>
      <p className="text-xs text-muted mb-3">
        From {plannedCount} planned session{plannedCount === 1 ? '' : 's'}
      </p>

      <form onSubmit={e => {
        e.preventDefault()
        const parsed = parseIngredients(inputText)
        if (parsed.length === 0) return
        const next = mergeExtras(extras, [...parsed])
        setExtras(next)
        saveExtras(weekStart, next)
        setInputText('')
      }}>
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Add item"
            placeholder="Add an item, e.g. 2 lb chicken"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral flex-1"
          />
          <button type="submit" className="px-5 bg-coral-deep hover:bg-coral-deeper text-white rounded-2xl font-bold py-3">Add</button>
        </div>
      </form>

      {(items.length === 0 && extras.length === 0) ? (
        <p className="px-3 py-6 text-center text-muted">No ingredients in this week&apos;s planned sessions.</p>
      ) : (
        <>
          <div className="bg-card rounded-3xl shadow-card space-y-1 pb-2">
            {items.map(item => {
              const key = groceryKey(item)
              const isTicked = ticked.has(key)
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 px-2 py-2 rounded-2xl cursor-pointer min-h-[44px] ${isTicked ? 'text-muted line-through' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isTicked}
                    onChange={() => toggle(key)}
                    className="accent-coral-deep w-5 h-5 shrink-0"
                  />
                  <span className="text-sm flex-1">{formatGroceryItem(item)}</span>
                </label>
              )
            })}
          </div>

          {extras.length > 0 && (
            <>
              <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-section mt-4 mb-2">Added by hand</p>
              <div className="bg-card rounded-3xl shadow-card space-y-1 pb-2 mb-3">
                {extras.map(item => {
                  const key = groceryKey(item)
                  const isTicked = ticked.has(key)
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 px-2 py-2 rounded-2xl cursor-pointer min-h-[44px] ${isTicked ? 'text-muted line-through' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isTicked}
                        onChange={() => toggle(key)}
                        className="accent-coral-deep w-5 h-5 shrink-0"
                      />
                      <span className="text-sm flex-1">{formatGroceryItem(item)}</span>
                      <button type="button" aria-label={'Remove ' + item.name} onClick={() => {
                        const next = removeExtra(extras, key)
                        setExtras(next)
                        saveExtras(weekStart, next)
                      }} className="text-muted px-2 py-1">✕</button>
                    </label>
                  )
                })}
              </div>
            </>
          )}

          {(groceryText(allItems, ticked) !== '') && (
            <button
              type="button"
              onClick={async () => {
                setSendError(null)
                setSendState('sending')
                try {
                  const result = await sendText(groceryText(allItems, ticked), navigator as unknown as SendNav)
                  if (result === 'cancelled') {
                    setSendState('idle')
                  } else {
                    setHow(result)
                    setSendState('asking')
                  }
                } catch (err) {
                  setSendError(err instanceof Error ? err.message : 'Could not send the list.')
                  setSendState('idle')
                }
              }}
              disabled={sendState === 'sending'}
              className="mt-2 inline-block text-sm bg-coral-light text-link rounded-2xl font-semibold px-4 py-2">
              {sendState === 'sending' ? 'Sending…' : 'Send to Keep'}
            </button>
          )}

          {sendState === 'asking' && (
            <div className="bg-card rounded-3xl shadow-card p-4 mt-3 text-sm space-y-2">
              <p>{how === 'shared' ? 'Sent. Clear the list?' : 'Copied. Clear the list?'}</p>
              <p className="text-xs text-muted">This ticks every item on this phone. Your prep sessions stay as they are.</p>
              <div className="flex gap-2">
                <button onClick={() => {
                  const keys = new Set(allItems.map(item => groceryKey(item)))
                  setTicked(keys)
                  saveTicks(weekStart, keys)
                  setSendState('idle')
                }} className="px-3 py-1 rounded bg-coral-deep text-white font-bold">Yes, clear</button>
                <button onClick={() => setSendState('idle')} className="px-3 py-1 rounded text-muted">Not now</button>
              </div>
            </div>
          )}

          {sendError && (
            <p className="text-danger text-xs mt-1">{sendError}</p>          )}

          {ticked.size > 0 && (
            <button onClick={clear} className="mt-2 text-sm text-link underline">Clear ticks</button>
          )}
        </>
      )}
    </div>
  )
}

function loadTicks(weekStart: string): Set<string> {
  try {
    const raw = localStorage.getItem(`calbud:grocery:${weekStart}`)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(arr as unknown as string[])
  } catch {
    return new Set()
  }
}

function saveTicks(weekStart: string, ticks: Set<string>): void {
  try {
    localStorage.setItem(`calbud:grocery:${weekStart}`, JSON.stringify([...ticks]))
  } catch {
    // Silently fail — keep state in memory only
  }
}
