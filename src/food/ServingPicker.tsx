import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { FoodResult } from './types'
import { foodKey, setFavorite } from './favorites'
import { useFavoriteFoods } from './useFavoriteFoods'
import { scaleNutrition } from './nutrition'
import { defaultMealType, localDateString } from '../lib/dates'
import { dayLabel } from '../prep/week'
import { logFood } from './logFood'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../household/useProfile'
import { queryClient } from '../lib/queryClient'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const toggle = (on: boolean) =>
  `py-3 px-4 rounded font-semibold text-white flex-1 ${on ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`

export default function ServingPicker({ food, onLogged, onCancel, meal, loggedOn }: {
  food: FoodResult
  onLogged: () => void
  onCancel: () => void
  meal?: MealType
  loggedOn?: string
}) {
  const servingG = food.servingG
  const [unit, setUnit] = useState<'g' | 'serving'>(servingG != null ? 'serving' : 'g')
  const [amount, setAmount] = useState(servingG != null ? '1' : '100')
  const [mealType, setMealType] = useState<MealType>(meal ?? defaultMealType())
  const { session } = useAuth()
  const { profile } = useProfile()

  const favoriteFoods = useFavoriteFoods()
  const isFav = favoriteFoods.data?.some((f) => foodKey(f) === foodKey(food)) ?? false

  const favoriteMutation = useMutation({
    mutationFn: () => setFavorite(food, profile!.household_id!, !isFav),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['favorite-foods'] })
    },
  })

  const n = Number(amount)
  const grams = unit === 'serving' && servingG != null ? n * servingG : n
  const isValid = amount.trim() !== '' && Number.isFinite(grams) && grams > 0 && grams <= 5000
  const nutrition = isValid ? scaleNutrition(food, grams) : null

  const mutation = useMutation({
    mutationFn: () => logFood({
      food, grams, mealType,
      loggedOn: loggedOn ?? localDateString(), // read at the moment Log is pressed
      userId: session!.user.id,
      householdId: profile!.household_id!,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-logs'] })
      await queryClient.invalidateQueries({ queryKey: ['recent-foods'] })
      onLogged()
    },
  })

  // Keep the same amount of food when switching units.
  const switchUnit = (next: 'g' | 'serving') => {
    if (next === unit || servingG == null) return
    if (isValid) setAmount(next === 'g' ? String(Math.round(grams)) : String(Math.round((grams / servingG) * 100) / 100))
    setUnit(next)
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{food.name}</p>
          {food.brand && <p className="text-gray-400 text-sm">{food.brand}</p>}
          {loggedOn != null && loggedOn !== localDateString() && (
            <p className="text-gray-500 text-sm">Logging to {dayLabel(loggedOn)}</p>
          )}
        </div>
        <button type="button"
          aria-pressed={isFav}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          disabled={favoriteMutation.isPending || favoriteFoods.isPending}
          onClick={() => favoriteMutation.mutate()}
          className={`text-2xl leading-none px-2 py-1 rounded hover:bg-slate-700 ${isFav ? 'text-yellow-400' : 'text-gray-400'}`}>
          {isFav ? '★' : '☆'}
        </button>
      </div>

      {favoriteMutation.isError && <p className="text-red-400 text-sm">{favoriteMutation.error.message}</p>}

      {servingG != null && (
        <div className="flex gap-2">
          <button type="button" aria-pressed={unit === 'serving'} onClick={() => switchUnit('serving')} className={toggle(unit === 'serving')}>Servings</button>
          <button type="button" aria-pressed={unit === 'g'} onClick={() => switchUnit('g')} className={toggle(unit === 'g')}>Grams</button>
        </div>
      )}

      <div>
        <label htmlFor="amount" className="block text-gray-400 text-sm mb-1">{unit === 'serving' ? 'Servings' : 'Grams'}</label>
        <input id="amount" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white text-lg focus:outline-none focus:border-blue-500" />
        {unit === 'serving' && food.servingLabel && isValid && (
          <p className="text-gray-400 text-sm mt-1">{amount} × {food.servingLabel} = {Math.round(grams)} g</p>
        )}
      </div>

      {nutrition ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          {([['Calories', nutrition.kcal], ['Protein', `${nutrition.protein_g} g`], ['Carbs', `${nutrition.carbs_g} g`], ['Fat', `${nutrition.fat_g} g`]] as const).map(([label, val]) => (
            <div key={label} className="bg-slate-900 rounded py-2">
              <p className="text-white text-sm font-semibold">{val}</p>
              <p className="text-gray-400 text-xs">{label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-red-400 text-sm text-center">Enter an amount between 0 and 5000 g.</p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {MEALS.map((m) => (
          <button key={m} type="button" onClick={() => setMealType(m)} aria-pressed={mealType === m}
            className={`py-3 rounded text-white text-sm font-semibold ${mealType === m ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}
          className="py-3 rounded font-semibold text-white flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed">
          {mutation.isPending ? 'Logging…' : 'Log'}
        </button>
        <button type="button" onClick={onCancel} disabled={mutation.isPending}
          className="py-3 rounded bg-slate-700 text-white font-semibold px-4 hover:bg-slate-600">Cancel</button>
      </div>

      {mutation.isError && <p className="text-red-400 text-sm text-center">{mutation.error.message}</p>}
    </div>
  )
}
