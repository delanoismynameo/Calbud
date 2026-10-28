import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { MEALS, type MealType, type MealLog } from './types'
import { updateMealLog, deleteMealLog } from './mealLogApi'
import { rescaleLog } from './totals'

export default function EditMealLog({ log, onClose }: {
  log: MealLog
  onClose: () => void
}) {
  const [grams, setGrams] = useState(String(log.quantity_g))
  const [mealType, setMealType] = useState<MealType>(log.meal_type)
  const [deleteStep, setDeleteStep] = useState(0)

  const n = Number(grams)
  const isValid = Number.isFinite(n) && n > 0 && n <= 5000
  const scaled = isValid ? rescaleLog(log, n) : null

  const saveMutation = useMutation({
    mutationFn: () => updateMealLog(log.id, {
      meal_type: mealType,
      ...scaled!,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-logs'] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteMealLog(log.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-logs'] })
      onClose()
    },
  })

  const anyPending = saveMutation.isPending || deleteMutation.isPending

  return (
    <div className="bg-slate-900 rounded p-3 space-y-3">
      <div>
        <label htmlFor={`edit-grams-${log.id}`} className="block text-gray-400 text-sm mb-1">Grams</label>
        <input
          id={`edit-grams-${log.id}`}
          type="text"
          inputMode="decimal"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-white text-lg focus:outline-none focus:border-blue-500"
        />
      </div>
      {!isValid && <p className="text-red-400 text-sm">Enter an amount between 0 and 5000 g.</p>}
      {scaled && isValid && <p className="text-gray-400">{scaled.kcal} kcal</p>}

      <div>
        <span className="block text-gray-400 text-sm mb-1">Meal</span>
        <div className="grid grid-cols-4 gap-2">
          {MEALS.map((m) => (
            <button
              key={m} type="button"
              aria-pressed={mealType === m}
              onClick={() => setMealType(m)}
              className={`py-3 rounded text-sm font-semibold text-white ${
                mealType === m ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button" onClick={() => saveMutation.mutate()} disabled={!isValid || anyPending}
          className="py-3 rounded font-semibold text-white flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button" onClick={() => deleteStep === 0 ? setDeleteStep(1) : deleteMutation.mutate()} disabled={anyPending}
          className="py-3 rounded font-semibold text-white flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {deleteMutation.isPending ? 'Deleting…' : deleteStep === 1 ? 'Tap again to delete' : 'Delete'}
        </button>
        <button
          type="button" onClick={onClose} disabled={anyPending} className="py-3 rounded bg-slate-700 text-white font-semibold px-4 hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>

      {saveMutation.isError && <p className="text-red-400 text-sm">{saveMutation.error.message}</p>}
      {deleteMutation.isError && <p className="text-red-400 text-sm">{deleteMutation.error.message}</p>}
    </div>
  )
}
