import { useState } from 'react'
import { groceryList, formatGroceryItem, groceryKey, filterGroceryItems } from './grocery'
import type { GroceryItem } from './grocery'
import type { MealPrep } from './types'
import { sendText, groceryText, copyAndOpen, isKeepLink, loadKeepLink, saveKeepLink, type SendNav } from './sendList'
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
  const [keepLink, setKeepLink] = useState<string | null>(() => loadKeepLink())
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)

  const [isBoughtExpanded, setIsBoughtExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const items = groceryList(plannedLists)
  const allItems = groceryList([...plannedLists, extras])

  const { mainItems, activeExtras, boughtItems } = filterGroceryItems(items, extras, ticked)

  async function send(toNote: boolean) {
    setSendError(null)
    setSendState('sending')
    try {
      const text = groceryText(allItems, ticked)
      const nav = navigator as unknown as SendNav
      const result = toNote && keepLink
        ? await copyAndOpen(text, keepLink, nav, url => { window.open(url, '_blank', 'noopener') })
        : await sendText(text, nav)
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
  }

  function saveLink() {
    if (!isKeepLink(linkText)) {
      setLinkError('That is not a Keep link. It should start with https://keep.google.com/')
      return
    }
    saveKeepLink(linkText)
    setKeepLink(linkText.trim())
    setLinkError(null)
    setLinkOpen(false)
  }

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
          {mainItems.length === 0 && activeExtras.length === 0 && (
            <p className="px-3 py-6 text-center text-muted">Everything is bought.</p>
          )}
          {mainItems.length > 0 && <div className="bg-card rounded-3xl shadow-card space-y-1 pb-2">
            {mainItems.map(item => {
              const key = groceryKey(item)
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 px-2 py-2 rounded-2xl cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => { toggleTick.mutate({ key, ticked: true }) }}
                    className="accent-coral-deep w-5 h-5 shrink-0"
                  />
                  <span className="text-sm flex-1">{formatGroceryItem(item)}</span>
                </label>
              )
            })}
          </div>}
          {activeExtras.length > 0 && (
            <>
              <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-section mt-4 mb-2">Added by hand</p>
              <div className="bg-card rounded-3xl shadow-card space-y-1 pb-2 mb-3">
                {activeExtras.map(item => {
                  const key = groceryKey(item)
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 px-2 py-2 rounded-2xl cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => { toggleTick.mutate({ key, ticked: true }) }}
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
            <>
              <button
                type="button"
                onClick={() => { void send(true) }}
                disabled={sendState === 'sending'}
                className="mt-2 inline-block text-sm bg-coral-light text-link rounded-2xl font-semibold px-4 py-2">
                {sendState === 'sending' ? 'Sending…' : 'Send to Keep'}
              </button>
              <p className="text-xs text-muted mt-1">
                {keepLink ? (
                  <>
                    Copies the list and opens your Keep note.{' '}
                    <button type="button" onClick={() => { setLinkText(keepLink); setLinkError(null); setLinkOpen(true) }} className="text-link font-semibold">Change note</button>
                    {' · '}
                    <button type="button" onClick={() => { void send(false) }} disabled={sendState === 'sending'} className="text-link font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Share instead</button>
                  </>
                ) : (
                  <button type="button" onClick={() => { setLinkText(''); setLinkError(null); setLinkOpen(true) }} className="text-link font-semibold">Send to one note every time</button>
                )}
              </p>
            </>
          )}

          {linkOpen && (
            <div className="bg-card rounded-3xl shadow-card p-4 mt-3 text-sm space-y-2">
              <p>Open your grocery note at keep.google.com (on a computer, or in your phone&apos;s browser), copy the address from the address bar and paste it here.</p>
              <input
                type="url"
                aria-label="Keep note link"
                placeholder="https://keep.google.com/…"
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral"
              />
              {linkError && <p className="text-danger text-xs">{linkError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={saveLink} className="px-3 py-1 rounded bg-coral-deep text-white font-bold">Save</button>
                {keepLink && (
                  <button type="button" onClick={() => { saveKeepLink(null); setKeepLink(null); setLinkOpen(false) }} className="px-3 py-1 rounded text-danger">Remove</button>
                )}
                <button type="button" onClick={() => setLinkOpen(false)} className="px-3 py-1 rounded text-muted">Cancel</button>
              </div>
            </div>
          )}

          {sendState === 'asking' && (
            <div className="bg-card rounded-3xl shadow-card p-4 mt-3 text-sm space-y-2">
              <p>{how === 'shared' ? 'Sent. Clear the list?' : 'Copied. Paste it into your note, then clear the list here?'}</p>
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

          <div className="mt-6">
            {boughtItems.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setIsBoughtExpanded(!isBoughtExpanded)}
                  className="flex items-center gap-2 text-sm font-bold text-section"
                >
                  Bought ({boughtItems.length})
                  <span>{isBoughtExpanded ? '▲' : '▼'}</span>
                </button>
                {isBoughtExpanded && (
                  <div className="bg-card rounded-3xl shadow-card p-2 space-y-1">
                    {boughtItems.map(item => {
                      const key = groceryKey(item)
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-3 px-2 py-2 rounded-2xl cursor-pointer min-h-[44px] bg-card"
                          onClick={() => { toggleTick.mutate({ key, ticked: false }) }}
                        >
                          <input
                            type="checkbox"
                            checked={true}
                            readOnly
                            className="accent-coral-deep w-5 h-5 shrink-0"
                          />
                          <span className="text-sm flex-1">{formatGroceryItem(item)}</span>
                        </label>
                      )
                    })}
                    <button
                      onClick={() => {
                        const boughtExtras = extras.filter(item => ticked.has(groceryKey(item)))
                        if (window.confirm(`Delete ${boughtExtras.length} bought item${boughtExtras.length === 1 ? '' : 's'} you added by hand? Items from your plan stay here, ticked.`)) {
                          boughtExtras.forEach(item => removeExtraMutation.mutate(groceryKey(item)))
                        }
                      }}
                      className="mt-2 text-xs text-danger font-bold"
                    >
                      Delete bought items I added
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
