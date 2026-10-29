import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import type { MenuMeal, MenuSlot } from './types'
import type { MealPrep } from '../prep/types'
import { dayLabel, weekDays, weekStart } from '../prep/week'
import { mealLabel, parseSlotLabel, copyRows } from './menu'
import { saveSlot, clearSlot, saveSlots } from './menuApi'
import { useProfile } from '../household/useProfile'

const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500'

export default function SlotEditor({ date, meal, slot, dishes, filled, onClose }: {
  date: string
  meal: MenuMeal
  slot?: MenuSlot
  dishes: MealPrep[]
  filled: string[]
  onClose: () => void
}) {
  const [text, setText] = useState(slot?.label ?? '')
  const [prepId, setPrepId] = useState<string | null>(slot?.prep_id ?? null)
  const [picked, setPicked] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const { profile } = useProfile()

  const saveMutation = useMutation({
    mutationFn: async (label: string) => {
      if (!profile?.household_id) throw new Error('Join or create a household first.')
      await saveSlot(profile.household_id, date, meal, label, prepId)
      if (picked.length > 0) {
        await saveSlots(profile.household_id, copyRows(date, meal, label, prepId, picked))
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['menu'] })
      onClose()
    },
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!slot) throw new Error('No slot to clear.')
      await clearSlot(slot.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['menu'] })
      onClose()
    },
  })

  const anyPending = saveMutation.isPending || clearMutation.isPending

  // Check the label first so its error shows under the field.
  const save = () => {
    const parsed = parseSlotLabel(text)
    if (!parsed.ok) { setError(parsed.error); return }
    saveMutation.mutate(parsed.label)
  }

  const handleDishClick = (dish: MealPrep) => {
    setPrepId(dish.id)
    setText(dish.title)
    setError(null)
  }

  return (
    <div className="bg-slate-900 rounded p-3 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 px-1">{dayLabel(date)} · {mealLabel(meal)}</h2>

      {dishes.length > 0 && (
        <div>
          <p className="text-gray-400 text-sm mb-1">This week's dishes</p>
          <div className="flex flex-wrap gap-2">
            {dishes.map(dish => (
              <button
                key={dish.id}
                type="button"
                onClick={() => handleDishClick(dish)}
                disabled={anyPending}
                aria-pressed={prepId === dish.id}
                className={`py-1 px-3 rounded text-xs font-medium ${
                  prepId === dish.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {dish.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="slot-label" className="block text-gray-400 text-sm mb-1">Or type it</label>
        <input
          id="slot-label"
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setPrepId(null); setError(null) }}
          placeholder="OYO, sandwich, eat out…"
          className={inputClass}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      <div>
        <p className="text-gray-400 text-sm mb-1">Also put it on</p>
        <div className="flex flex-wrap gap-2">
          {weekDays(weekStart(date)).filter(d => d !== date).map(day => (
            <button
              key={day}
              type="button"
              onClick={() => {
                if (picked.includes(day)) setPicked(picked.filter(x => x !== day))
                else setPicked([...picked, day])
              }}
              disabled={anyPending}
              aria-pressed={picked.includes(day)}
              className={`py-1 px-3 rounded text-xs font-medium ${
                picked.includes(day) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {dayLabel(day).slice(0, 3)}{filled.includes(day) ? '*' : ''}
            </button>
          ))}
        </div>
        {picked.some(d => filled.includes(d)) && (
          <p className="text-gray-500 text-xs mt-1">* already has a meal. Saving replaces it.</p>
        )}
      </div>

      {saveMutation.isError && <p className="text-red-400 text-sm px-1">{saveMutation.error.message}</p>}
      {clearMutation.isError && <p className="text-red-400 text-sm px-1">{clearMutation.error.message}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={anyPending}
          className="py-3 rounded font-semibold text-white flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-center"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={anyPending}
          className="py-3 rounded bg-slate-700 text-white font-semibold px-4 hover:bg-slate-600 disabled:opacity-50"
        >
          Cancel
        </button>

        {slot && (
          <button
            type="button"
            onClick={() => clearMutation.mutate()}
            disabled={anyPending}
            className="py-3 rounded bg-slate-700 text-red-400 font-semibold px-4 hover:bg-slate-600 disabled:opacity-50 disabled:text-gray-500"
          >
            {clearMutation.isPending ? 'Clearing…' : 'Clear'}
          </button>
        )}
      </div>
    </div>
  )
}
