import { useState } from 'react'
import { groceryList, formatGroceryItem, groceryKey } from './grocery'
import type { GroceryItem } from './grocery'
import type { MealPrep } from './types'
import { sendText, groceryText, type SendNav } from './sendList'
import { useGroceryExtras, useGroceryTicks, useAddGroceryExtras, useRemoveGroceryExtra, useToggleGroceryTick, useSetGroceryTicks, useClearGroceryTicks } from './useGrocery'
import { parseIngredients } from './ingredients'

export default function GroceryList({ sessions, weekStart }: { sessions: MealPrep[]; weekStart: string }) {
  const plannedLists = sessions.filter(s => s.status === 'planned').map(s => s.ingredients)
  const extrasQuery = useGroceryExtras(weekStart)
  const ticksQuery = useGroceryTicks(weekStart)
  const addExtras = useAddGroceryExtras(weekStart)
  const removeExtraMutation = useRemoveGroceryExtra(weekStart)
  const toggleTick = useToggleGroceryTick(weekStart)
  const setTicks = useSetGroceryTicks(weekStart)
  const clearTicks = useClearGroceryTicks(weekStart)
  const extras = extrasQuery.data ?? []
  const ticked = new Set(ticksQuery.data ?? [])
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'asking'>('idle')
  const [how, setHow] = useState<'shared' | 'copied'>('shared')
  const [sendError, setSendError] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')

  const items = groceryList(plannedLists)
  const allItems = groceryList([...plannedLists, extras])

  let mutationError: string | null = null
  if (addExtras.isError && !mutationError) mutationError = addExtras.error.message
  if (removeExtraMutation.isError && !mutationError) mutationError = removeExtraMutation.error.message
  if (toggleTick.isError && !mutationError) mutationError = toggleTick.error.message
  if (setTicks.isError && !mutationError) mutationError = setTicks.error.message
  if (clearTicks.isError && !mutationError) mutationError = clearTicks.error.message

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
        addExtras.mutate([...parsed])
        setInputText('')
      }} className="mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Add item"
            placeholder="Add an item"
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
                    onChange={() => { toggleTick.mutate({ key, ticked: !isTicked }) }}
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
                        onChange={() => { toggleTick.mutate({ key, ticked: !isTicked }) }}
                        className="accent-coral-deep w-5 h-5 shrink-0"
                      />
                      <span className="text-sm flex-1">{formatGroceryItem(item)}</span>
                      <button type="button" aria-label={'Remove ' + item.name} onClick={() => removeExtraMutation.mutate(key)} className="text-muted px-2 py-1">✕</button>
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
              <p className="text-xs text-muted">This ticks every item for both of you. Your prep sessions stay as they are.</p>
              <div className="flex gap-2">
                <button onClick={() => {
                  setTicks.mutate(allItems.map(item => groceryKey(item)))
                  setSendState('idle')
                }} className="px-3 py-1 rounded bg-coral-deep text-white font-bold">Yes, clear</button>
                <button onClick={() => setSendState('idle')} className="px-3 py-1 rounded text-muted">Not now</button>
              </div>
            </div>
          )}

          {(sendError || mutationError) && (
            <p className="text-danger text-xs mt-1">{sendError ?? mutationError!}</p>          )}

          {ticked.size > 0 && (
            <button onClick={() => clearTicks.mutate()} className="mt-2 text-sm text-link underline">Clear ticks</button>
          )}
        </>
      )}
    </div>
  )
}
