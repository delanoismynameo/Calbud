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
    <div className="bg-card rounded-3xl shadow-card p-4 border border-line">
      <div>
        <label htmlFor={`edit-grams-${log.id}`} className="block text-muted text-sm mb-1">Grams</label>
        <input
          id={`edit-grams-${log.id}`}
          type="text"
          inputMode="decimal"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral"
        />
      </div>
      {!isValid && <p className="text-danger text-sm">Enter an amount between 0 and 5000 g.</p>}
      {scaled && isValid && <p className="text-muted">{scaled.kcal} cal</p>}

      <div>
        <span className="block text-muted text-sm mb-1">Meal</span>
        <div className="grid grid-cols-4 gap-2">
          {MEALS.map((m) => (
            <button
              key={m} type="button"
              aria-pressed={mealType === m}
              onClick={() => setMealType(m)}
              className={`py-3 rounded-2xl text-sm font-semibold ${
                mealType === m ? 'text-white bg-coral-deep hover:bg-coral-deeper' : 'text-ink bg-card hover:bg-coral-light border border-line'
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
          className="py-3 rounded-2xl font-bold text-white flex-1 bg-coral-deep hover:bg-coral-deeper disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button" onClick={() => deleteStep === 0 ? setDeleteStep(1) : deleteMutation.mutate()} disabled={anyPending}
          className="py-3 rounded-2xl font-semibold flex-1 text-danger border border-line hover:bg-coral-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleteMutation.isPending ? 'Deleting…' : deleteStep === 1 ? 'Tap again to delete' : 'Delete'}
        </button>
        <button
          type="button" onClick={onClose} disabled={anyPending} className="py-3 rounded-2xl bg-card border border-line text-ink font-semibold px-4 hover:bg-coral-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>

      {saveMutation.isError && <p className="text-danger text-sm">{saveMutation.error.message}</p>}
      {deleteMutation.isError && <p className="text-danger text-sm">{deleteMutation.error.message}</p>}
    </div>
  )
}
