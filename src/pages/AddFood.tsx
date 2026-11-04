import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router'
import ServingPicker from '../food/ServingPicker'
import type { FoodResult } from '../food/types'
import CustomFoodForm from '../food/CustomFoodForm'
import FoodFinder from '../food/FoodFinder'
import { validDayParam, dayTitle } from '../today/day'
import { useLocalDate } from '../lib/useLocalDate'

// History state key to identify our pushed entry
const SELECTION_STATE_KEY = '__calbud_add_food_selection'

export default function AddFood() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const today = useLocalDate()
  const day = validDayParam(params.get('date'), today)
  const home = day ? `/?date=${day}` : '/'
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [creating, setCreating] = useState(false)
  // Refs to track current state for the popstate handler
  const selectedRef = useRef<FoodResult | null>(null)
  const creatingRef = useRef(false)
  // Track if we've pushed a history entry for the current selection
  const pushedRef = useRef(false)

  // Keep refs in sync with state
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])
  useEffect(() => {
    creatingRef.current = creating
  }, [creating])

  // Handle browser back button: when user presses back while in selection mode,
  // cancel the selection to show the search
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // event.oldState is the state of the entry we're leaving (being popped)
      // Check if we're leaving from a pushed selection entry
      const isLeavingSelectionEntry = (event as PopStateEvent & { oldState: Record<string, boolean> | null }).oldState?.[SELECTION_STATE_KEY]
      
      if (isLeavingSelectionEntry && (selectedRef.current != null || creatingRef.current)) {
        // User is pressing back while in selection mode
        // Cancel selection to show search
        setSelected(null)
        setCreating(false)
        pushedRef.current = false
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, []) // Stable handler - uses refs to access current state

  // Push a history entry when entering food selection mode
  // This ensures browser back navigates to the search view
  useEffect(() => {
    const inSelectionMode = selected != null || creating
    
    if (inSelectionMode && !pushedRef.current) {
      // Just entered selection mode, push a history entry
      window.history.pushState({ [SELECTION_STATE_KEY]: true }, '', location.pathname + location.search)
      pushedRef.current = true
    } else if (!inSelectionMode && pushedRef.current) {
      // Exiting selection mode, reset the flag
      pushedRef.current = false
    }
  }, [selected, creating, location.pathname, location.search])

  return (
    <div className="bg-cream space-y-3">
      <div className="flex items-center gap-4">
        {selected || creating ? (
          <button
            type="button"
            onClick={() => { setSelected(null); setCreating(false) }}
            className="text-link underline hover:text-link font-bold py-2"
          >
            &larr; Back
          </button>
        ) : (
          <Link to={home} className="text-link underline hover:text-link font-bold py-2">&larr; Back</Link>
        )}
        <h1 className="text-lg font-semibold text-ink">Add food{day && day !== today && <span className="text-muted text-sm ml-2"> · {dayTitle(day, today)}</span>}</h1>
      </div>

      {selected ? (
        <ServingPicker food={selected} onLogged={() => navigate(home)} loggedOn={day ?? undefined} onCancel={() => setSelected(null)} />
      ) : creating && (
        <CustomFoodForm onSaved={(food) => { setCreating(false); setSelected(food) }} onCancel={() => setCreating(false)} />
      )}
      {/* Kept mounted while hidden, so the search text survives picking a food and pressing Cancel. */}
      <div className={selected || creating ? 'hidden' : 'space-y-3'}>
        <FoodFinder onPick={setSelected} onCreate={() => setCreating(true)} />
      </div>
    </div>
  )
}