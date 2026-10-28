import { useState, useEffect, useCallback } from 'react'
import { groceryList, formatGroceryItem, groceryKey } from './grocery'
import type { MealPrep } from './types'

export default function GroceryList({ sessions, weekStart }: { sessions: MealPrep[]; weekStart: string }) {
  const items = groceryList(sessions.filter(s => s.status === 'planned').map(s => s.ingredients))
  const [ticked, setTicked] = useState<Set<string>>(() => loadTicks(weekStart))

  useEffect(() => {
    // Re-read from storage when weekStart changes
    setTicked(loadTicks(weekStart))
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
      <h2 className="text-base font-semibold mb-1 pt-2 border-b border-slate-700 text-gray-200">
        Grocery list
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        From {plannedCount} planned session{plannedCount === 1 ? '' : 's'}
      </p>

      {items.length === 0 ? (
        <p className="px-3 py-6 text-center text-gray-500">No ingredients in this week&apos;s planned sessions.</p>
      ) : (
        <>
          <div className="space-y-1 pb-2">
            {items.map(item => {
              const key = groceryKey(item)
              const isTicked = ticked.has(key)
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 px-2 py-2 rounded cursor-pointer min-h-[44px] ${isTicked ? 'text-gray-500 line-through' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isTicked}
                    onChange={() => toggle(key)}
                    className="accent-blue-500 w-5 h-5 shrink-0"
                  />
                  <span className="text-sm flex-1">{formatGroceryItem(item)}</span>
                </label>
              )
            })}
          </div>

          {ticked.size > 0 && (
            <button onClick={clear} className="mt-2 text-sm text-blue-400 underline">Clear ticks</button>
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
