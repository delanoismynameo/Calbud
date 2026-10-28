import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { scaleNutrition } from './nutrition'
import type { FoodResult } from './types'
import { defaultMealType, localDateString } from '../lib/dates'
import { logFood } from './logFood'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../household/useProfile'
import { queryClient } from '../lib/queryClient'

const MEALS: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack']

export default function ServingPicker({ food, onDone }: { food: FoodResult; onDone: () => void }) {
  const [unit, setUnit] = useState<'g' | 'serving'>(food.servingG != null ? 'serving' : 'g')
  const [amount, setAmount] = useState<string>(food.servingG != null ? '1' : '100')
  const [mealType, setMealType] = useState(defaultMealType())
  const { session } = useAuth()
  const { profile } = useProfile()

  const grams = unit === 'g' ? Number(amount) : food.servingG != null ? Number(amount) * food.servingG : 0
  const isValid = Number.isFinite(grams) && grams > 0 && grams <= 5000
  const nutrition = isValid ? scaleNutrition(food, grams) : { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }

  const mutation = useMutation({
    mutationFn: () => logFood({
      food, grams, mealType,
      loggedOn: localDateString(),
      userId: session!.user.id,
      householdId: profile!.household_id!,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meal-logs'] }); onDone() },
  })

  const handleLog = useCallback(() => { if (isValid) mutation.mutate() }, [isValid, mealType, grams])

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl p-4 space-y-4">
      {/* Unit toggle */}
      <div className="flex gap-2">
        <button onClick={() => setUnit('g')} className={`py-3 px-4 rounded font-semibold text-white flex-1 ${unit === 'g' ? 'bg-blue-600' : 'bg-slate-700'}`}>g</button>
        {food.servingG != null && (
          <button onClick={() => setUnit('serving')} className={`py-3 px-4 rounded font-semibold text-white flex-1 ${unit === 'serving' ? 'bg-blue-600' : 'bg-slate-700'}`}>
            serving{food.servingLabel != null && food.brand != null ? ` (${food.servingLabel})` : ''}
          </button>
        )}
      </div>

      {/* Amount input */}
      <input type="text" inputMode="decimal" value={amount} autoFocus={false}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white text-lg focus:outline-none focus:border-blue-500" />

      {food.servingG != null && unit === 'serving' && food.servingLabel != null && (
        <p className="text-gray-400 text-sm">{amount} {food.servingLabel} ({Math.round(Number(amount) * food.servingG)} g)</p>
      )}

      {/* Live nutrition */}
      {isValid && nutrition.kcal > 0 && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['kcal', nutrition.kcal], ['protein_g', nutrition.protein_g], ['carbs_g', nutrition.carbs_g], ['fat_g', nutrition.fat_g]].map(([label, val]) => (
            <div key={String(label)} className="bg-slate-900 rounded py-2">
              <p className="text-white text-sm">{val}</p>
              <p className="text-gray-400 text-xs">{label}</p>
            </div>
          ))}
        </div>
      )}

      {!isValid && <p className="text-red-400 text-sm text-center">Enter an amount between 0 and 5000 g.</p>}

      {/* Meal type */}
      <div className="grid grid-cols-4 gap-2">
        {MEALS.map((m) => (
          <button key={m} onClick={() => setMealType(m)} aria-pressed={mealType === m}
            className={`py-3 rounded text-white text-sm font-semibold ${mealType === m ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button disabled={!isValid || mutation.isPending}
          className={`py-3 rounded font-semibold text-white flex-1 ${!isValid || mutation.isPending ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {mutation.isPending ? 'Logging…' : 'Log'}
        </button>
        <button onClick={onDone} className="py-3 rounded bg-slate-700 text-white font-semibold px-4 hover:bg-slate-600">Cancel</button>
      </div>

      {mutation.isError && <p className="text-red-400 text-sm text-center">{(mutation.error as Error).message}</p>}
    </div>
  )
}
