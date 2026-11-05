import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { FoodResult } from './types'
import { foodKey, setFavorite } from './favorites'
import { useFavoriteFoods } from './useFavoriteFoods'
import { scaleNutrition } from './nutrition'
import NutritionLabel from './NutritionLabel'
import { labelRows, servingLine } from './label'
import { scaleExtras } from './extras'
import { defaultMealType, localDateString } from '../lib/dates'
import { dayLabel } from '../prep/week'
import { logFood } from './logFood'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../household/useProfile'
import { queryClient } from '../lib/queryClient'
import { applyLabelEdit, applyServingEdit } from './labelEdit'
import { servingWarning } from './servingCheck'
import { saveBarcodeFood, deleteSavedBarcodeFoodAndLookupOriginal } from './householdBarcode'
import FoodImage from './FoodImage'
import ConvertPopup from './ConvertPopup'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const toggle = (on: boolean) =>
  `py-3 px-4 rounded font-semibold flex-1 ${on ? 'bg-coral-deep text-white' : 'bg-coral-light/50 text-link hover:bg-coral-light'}`

export default function ServingPicker({ food, onLogged, onCancel, meal, loggedOn }: {
  food: FoodResult
  onLogged: () => void
  onCancel: () => void
  meal?: MealType
  loggedOn?: string
}) {
  const [edited, setEdited] = useState<FoodResult | null>(null)
  const shown = edited ?? food
  const warning = servingWarning(shown)

  const servingG = shown.servingG
  const displayUnit = shown.unit
  const amountWord = displayUnit === 'ml' ? 'ml' : 'Grams'
  const [unit, setUnit] = useState<'g' | 'serving'>(servingG != null ? 'serving' : 'g')
  const [amount, setAmount] = useState(servingG != null ? '1' : '100')
  const [editingServing, setEditingServing] = useState(false)
  const [servingText, setServingText] = useState('')
  const [servingGrams, setServingGrams] = useState('')
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

  const saveBarcodeMutation = useMutation({
    mutationFn: () => saveBarcodeFood(shown, profile!.household_id!),
    onSuccess: (saved) => setEdited(saved),
  })
  const isBarcodeSaved = saveBarcodeMutation.data != null && edited === saveBarcodeMutation.data
  const canSaveBarcode = edited != null && shown.barcode != null && /^[0-9]{6,14}$/.test(shown.barcode)

  // Mutation for "Use the original" button - deletes saved food and looks up original
  const useOriginalMutation = useMutation({
    mutationFn: () => deleteSavedBarcodeFoodAndLookupOriginal(profile!.household_id!, shown.barcode!),
    onSuccess: (original) => {
      if (original) {
        setEdited(original)
      }
      queryClient.invalidateQueries({ queryKey: ['favorite-foods'] })
      queryClient.invalidateQueries({ queryKey: ['recent-foods'] })
    },
  })
  const isSavedBarcodeFood = food.source === 'custom' && food.barcode != null && /^[0-9]{6,14}$/.test(food.barcode)

  const n = Number(amount)
  const grams = unit === 'serving' && servingG != null ? n * servingG : n
  const isValid = amount.trim() !== '' && Number.isFinite(grams) && grams > 0 && grams <= 5000
  const nutrition = isValid ? scaleNutrition(shown, grams) : null

  const mutation = useMutation({
    mutationFn: () => logFood({
      food: shown, grams, mealType,
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

  // Switch how this food is measured ('g' | 'ml'), for example when Open Food Facts has no size
  // for a drink and it defaults to grams. Tapping sets the other unit and counts as an edit, so the
  // screen changes to that word and 'Save for this barcode' can store the chosen unit.
  const toggleMeasuredIn = (next: 'g' | 'ml') => {
    if (shown.unit === next) return
    setEdited({ ...shown, unit: next })
  }

  const saveServing = (e: FormEvent) => {
    e.preventDefault()
    const g = Number(servingGrams.replace(',', '.'))
    if (Number.isFinite(g) && g > 0 && g <= 5000) {
      setEdited(applyServingEdit(shown, servingText, g))
      setUnit('serving')
      setAmount('1')
      setEditingServing(false)
    }
  }

  return (
    <div className="bg-card rounded-3xl shadow-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <FoodImage imageUrl={food.imageUrl} photoPath={food.photoUrl} alt={food.name} />
        <div className="flex-1">
          <p className="font-semibold text-ink">{food.name}</p>
          {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
          {loggedOn != null && loggedOn !== localDateString() && (
            <p className="text-muted text-sm">Logging to {dayLabel(loggedOn)}</p>
          )}
        </div>
        <button type="button"
          aria-pressed={isFav}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          disabled={favoriteMutation.isPending || favoriteFoods.isPending}
          onClick={() => favoriteMutation.mutate()}
          className={`text-2xl leading-none px-2 py-1 rounded hover:bg-coral-light/50 ${isFav ? 'text-coral' : 'text-muted'}`}>
          {isFav ? '★' : '☆'}
        </button>
      </div>

      {favoriteMutation.isError && <p className="text-danger text-sm">{favoriteMutation.error.message}</p>}

      {servingG != null && (
        <div className="flex gap-2">
          <button type="button" aria-pressed={unit === 'serving'} onClick={() => switchUnit('serving')} className={toggle(unit === 'serving')}>Servings</button>
          <button type="button" aria-pressed={unit === 'g'} onClick={() => switchUnit('g')} className={toggle(unit === 'g')}>{amountWord}</button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div>
          <label htmlFor="amount" className="block text-muted text-sm mb-1">{unit === 'serving' ? 'Servings' : amountWord}</label>
          <input id="amount" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-coral" />
          {unit === 'serving' && shown.servingLabel && isValid && (
            <p className="text-muted text-sm mt-1">{amount} × {shown.servingLabel} = {Math.round(grams)} {displayUnit}</p>
          )}
        </div>
        <ConvertPopup food={shown} onConvert={(converted) => setAmount(String(converted))} />
      </div>

      {food.crossCheck && !edited && (
        <p className="text-danger text-sm">{food.crossCheck} Check the package, then tap a row on the label to correct it.</p>
      )}
      {warning && !editingServing && (
        <p className="text-danger text-sm mb-1">{warning} Check it, then tap Edit serving size to fix it.</p>
      )}

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-muted text-sm">Measured in:</span>
          <button type="button" aria-pressed={shown.unit === 'g'} onClick={() => toggleMeasuredIn('g')}
            className={`text-sm font-semibold px-3 py-1 rounded ${shown.unit === 'g' ? 'bg-coral-deep text-white' : 'bg-coral-light/50 text-link hover:bg-coral-light'}`}>g</button>
          <button type="button" aria-pressed={shown.unit === 'ml'} onClick={() => toggleMeasuredIn('ml')}
            className={`text-sm font-semibold px-3 py-1 rounded ${shown.unit === 'ml' ? 'bg-coral-deep text-white' : 'bg-coral-light/50 text-link hover:bg-coral-light'}`}>ml</button>
        </div>

        {editingServing ? (
          <form onSubmit={saveServing} className="space-y-2">
            <label htmlFor="serving-text" className="block text-muted text-sm">Serving name (for example 1 cup)</label>
            <input id="serving-text" type="text" value={servingText} onChange={(e) => setServingText(e.target.value)} className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-2 focus:outline-none focus:ring-2 focus:ring-coral" />
            <label htmlFor="serving-grams" className="block text-muted text-sm">Grams in one serving</label>
            <input id="serving-grams" type="text" inputMode="decimal" value={servingGrams} onChange={(e) => setServingGrams(e.target.value)} className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-2 focus:outline-none focus:ring-2 focus:ring-coral" />
            <div className="flex gap-3">
              <button type="submit" className="text-link font-semibold">Save serving</button>
              <button type="button" onClick={() => setEditingServing(false)} className="text-muted">Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => { setServingText(shown.servingLabel ?? ''); setServingGrams(shown.servingG != null ? String(shown.servingG) : ''); setEditingServing(true) }} className="text-link text-sm font-semibold">{shown.servingG != null ? 'Edit serving size' : 'Set serving size'}</button>
        )}
      </div>

      {nutrition ? (
        <div className="bg-card rounded-3xl shadow-card p-4 grid grid-cols-4 gap-2 text-center">
          {([['Calories', nutrition.kcal], ['Protein', `${nutrition.protein_g} g`], ['Carbs', `${nutrition.carbs_g} g`], ['Fat', `${nutrition.fat_g} g`]] as const).map(([label, val]) => (
            <div key={label} className="bg-cream rounded-2xl py-2">
              <p className="text-ink text-sm font-semibold">{val}</p>
              <p className="text-muted text-xs">{label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-danger text-sm text-center">Enter an amount between 0 and 5000 {displayUnit}.</p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {MEALS.map((m) => (
          <button key={m} type="button" onClick={() => setMealType(m)} aria-pressed={mealType === m}
            className={`py-3 rounded-2xl text-sm font-semibold ${mealType === m ? 'bg-coral-deep text-white' : 'bg-coral-light/50 text-link hover:bg-coral-light'}`}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}
          className="py-3 rounded-2xl font-bold text-white flex-1 bg-coral-deep hover:bg-coral-deeper disabled:bg-coral-light/50 disabled:cursor-not-allowed">
          {mutation.isPending ? 'Logging…' : 'Log'}
        </button>
        <button type="button" onClick={onCancel} disabled={mutation.isPending}
          className="py-3 rounded-2xl bg-coral-light text-link font-semibold px-4 hover:bg-coral-light/80">Cancel</button>
      </div>

      {mutation.isError && <p className="text-danger text-sm text-center">{mutation.error.message}</p>}

      {edited && (
        <p className="text-sm text-muted">Edited for this log. <button type="button" onClick={() => { setEdited(null); if (food.servingG == null) { setUnit('g'); setAmount('100') } }} className="text-link font-semibold">Undo</button></p>
      )}

      {canSaveBarcode && (isBarcodeSaved ? (<p className="text-sm text-muted">Saved. Scanning this barcode will use your version.</p>) : (<button type="button" onClick={() => saveBarcodeMutation.mutate()} disabled={saveBarcodeMutation.isPending} className="text-link text-sm font-semibold">{saveBarcodeMutation.isPending ? 'Saving…' : 'Save for this barcode'}</button>))}
      {saveBarcodeMutation.isError && <p className="text-danger text-sm">{saveBarcodeMutation.error.message}</p>}

      {/* Use the original button for saved barcode foods */}
      {isSavedBarcodeFood && !useOriginalMutation.isSuccess && (
        <button type="button" onClick={() => useOriginalMutation.mutate()} disabled={useOriginalMutation.isPending}
          className="text-link text-sm font-semibold">
          {useOriginalMutation.isPending ? 'Looking up…' : 'Use the original'}
        </button>
      )}

      {useOriginalMutation.isSuccess && useOriginalMutation.data == null && (
        <p className="text-sm text-muted">Your saved version is deleted. No original was found for this barcode.</p>
      )}
      {useOriginalMutation.isError && <p className="text-danger text-sm">{useOriginalMutation.error.message}</p>}

      {nutrition && (
        <NutritionLabel
          servingText={servingLine(unit, amount, grams, shown.servingLabel, displayUnit)}
          kcal={nutrition.kcal}
          rows={labelRows({ fat_g: nutrition.fat_g, carbs_g: nutrition.carbs_g, protein_g: nutrition.protein_g, extras: scaleExtras(shown.extras100g ?? {}, grams) })}
          values={{ kcal: nutrition.kcal, fat: nutrition.fat_g, carbs: nutrition.carbs_g, protein: nutrition.protein_g, ...scaleExtras(shown.extras100g ?? {}, grams) }}
          onEdit={(key, value) => setEdited(applyLabelEdit(shown, key, value, grams))}
          servingG={shown.servingG}
          servingLabel={shown.servingLabel}
          onEditServing={(label, grams) => { setEdited(applyServingEdit(shown, label, grams)); setUnit('serving'); setAmount('1') }}
        />
      )}
    </div>
  )
}
