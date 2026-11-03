import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { MEALS, type MealType, type MealLog } from './types'
import { updateMealLog, deleteMealLog } from './mealLogApi'
import type { FoodResult } from '../food/types'
import NutritionLabel from '../food/NutritionLabel'
import { labelRows } from '../food/label'
import { scaleExtras, type Extras, type ExtraKey } from '../food/extras'
import { applyLabelEdit } from '../food/labelEdit'
import { servingLine } from '../food/label'
import type { EditKey } from '../food/labelEdit'

// Create a virtual FoodResult from a MealLog for use with NutritionLabel
// The virtual food has per-100g values computed from the log's per-log values
export function logToVirtualFood(log: MealLog): FoodResult {
  const q = log.quantity_g
  // Convert extras from per-log to per-100g
  const extras100g: Extras = {}
  if (log.extra) {
    for (const [key, val] of Object.entries(log.extra)) {
      if (val !== undefined) {
        extras100g[key as ExtraKey] = val * 100 / q
      }
    }
  }
  return {
    source: 'usda',
    sourceId: log.food_id ?? 'unknown',
    name: log.name,
    brand: null,
    servingG: null,
    servingLabel: null,
    unit: 'g',
    kcal100g: log.kcal * 100 / q,
    protein100g: log.protein_g * 100 / q,
    carbs100g: log.carbs_g * 100 / q,
    fat100g: log.fat_g * 100 / q,
    fiber100g: null,
    sugar100g: null,
    sodiumMg100g: null,
    barcode: null,
    extras100g: Object.keys(extras100g).length > 0 ? extras100g : undefined,
  }
}

// Compute nutrition for a virtual food at a specific gram amount
export function computeNutrition(food: FoodResult, grams: number) {
  const n = Number(grams)
  const isValid = Number.isFinite(n) && n > 0 && n <= 5000
  if (!isValid) return null
  return {
    kcal: Math.round(food.kcal100g * n / 100),
    protein_g: Math.round(food.protein100g * n / 100 * 10) / 10,
    carbs_g: Math.round(food.carbs100g * n / 100 * 10) / 10,
    fat_g: Math.round(food.fat100g * n / 100 * 10) / 10,
    extras: food.extras100g ? scaleExtras(food.extras100g, n) : undefined,
  }
}

export default function EditMealLog({ log, onClose }: {
  log: MealLog
  onClose: () => void
}) {
  const [grams, setGrams] = useState(String(log.quantity_g))
  const [mealType, setMealType] = useState<MealType>(log.meal_type)
  const [deleteStep, setDeleteStep] = useState(0)
  const [virtualFood, setVirtualFood] = useState<FoodResult>(() => logToVirtualFood(log))

  const n = Number(grams)
  const isValid = Number.isFinite(n) && n > 0 && n <= 5000
  const nutrition = isValid ? computeNutrition(virtualFood, n) : null

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!nutrition) throw new Error('Invalid grams')
      return updateMealLog(log.id, {
        meal_type: mealType,
        quantity_g: n,
        kcal: nutrition.kcal,
        protein_g: nutrition.protein_g,
        carbs_g: nutrition.carbs_g,
        fat_g: nutrition.fat_g,
        ...(nutrition.extras ? { extra: nutrition.extras } : {}),
      })
    },
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

  // Handle nutrition label edits
  const handleEdit = (key: EditKey, value: number) => {
    setVirtualFood(applyLabelEdit(virtualFood, key, value, n))
  }

  // Compute the serving text for the nutrition label
  const servingText = useMemo(() => {
    if (!isValid || !nutrition) return Math.round(n) + ' g'
    return servingLine('g', String(Math.round(n)), Math.round(n), null, 'g')
  }, [isValid, nutrition, n])

  // Compute the values for the nutrition label
  const nutritionValues = useMemo(() => {
    if (!nutrition) return undefined
    return {
      kcal: nutrition.kcal,
      fat: nutrition.fat_g,
      carbs: nutrition.carbs_g,
      protein: nutrition.protein_g,
      ...(nutrition.extras ?? {}),
    }
  }, [nutrition])

  // Compute the label rows
  const nutritionRows = useMemo(() => {
    if (!nutrition) return []
    return labelRows({
      fat_g: nutrition.fat_g,
      carbs_g: nutrition.carbs_g,
      protein_g: nutrition.protein_g,
      extras: nutrition.extras ?? {},
    })
  }, [nutrition])

  return (
    <div className="bg-card rounded-3xl shadow-card p-4 border border-line space-y-4">
      {/* Nutrition Facts Label */}
      {isValid && nutrition && (
        <NutritionLabel
          servingText={servingText}
          kcal={nutrition.kcal}
          rows={nutritionRows}
          values={nutritionValues}
          onEdit={handleEdit}
        />
      )}

      {/* Grams input */}
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

      {/* Meal selector */}
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

      {/* Save and cancel buttons */}
      <div className="space-y-3">
        <button
          type="button" onClick={() => saveMutation.mutate()} disabled={!isValid || anyPending}
          className="w-full py-3 rounded-2xl font-bold text-white bg-coral-deep hover:bg-coral-deeper disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
        <div className="flex gap-3">
          <button
            type="button" onClick={() => deleteStep === 0 ? setDeleteStep(1) : deleteMutation.mutate()} disabled={anyPending}
            className="py-3 rounded-2xl font-semibold flex-1 text-danger border border-line hover:bg-coral-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? 'Deleting…' : deleteStep === 1 ? 'Tap again to delete' : 'Delete'}
          </button>
          <button
            type="button" onClick={onClose} disabled={anyPending} className="py-3 rounded-2xl bg-card border border-line text-ink font-semibold flex-1 hover:bg-coral-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Error messages */}
      {saveMutation.isError && <p className="text-danger text-sm">{saveMutation.error.message}</p>}
      {deleteMutation.isError && <p className="text-danger text-sm">{deleteMutation.error.message}</p>}
    </div>
  )
}