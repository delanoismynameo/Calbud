import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import type { MealPrep, PrepFields } from './types'
import type { PrepFormInput } from './formValidation'
import { parsePrepForm, prepFormFrom } from './formValidation'
import { insertPrep, updatePrep, deletePrep, saveDishFood } from './prepApi'
import { useProfile } from '../household/useProfile'
import { emptyDish, isDishBlank, dishFromFood, parseDish, type DishInput } from './dishFood'
import { useDishFoods } from './useDishFoods'
import type { FoodResult } from '../food/types'
import ExtrasFields from '../food/ExtrasFields'
import type { ExtraInputs, ExtraKey } from '../food/extras'
import { cleanExtras, extrasPerServing, parseExtraInputs } from '../food/extras'

const emptyInput: PrepFormInput = { title: '', date: '', startTime: '', duration: '', servings: '', recipeUrl: '', ingredients: '', notes: '' }

export default function PrepForm({
  prep,
  date,
  onClose,
}: {
  prep?: MealPrep
  date: string
  onClose: () => void
}) {
  const [input, setInput] = useState<PrepFormInput>(prep ? prepFormFrom(prep) : { ...emptyInput, date })
  const [errors, setErrors] = useState<Partial<Record<keyof PrepFormInput, string>>>({})
  const [dishErrors, setDishErrors] = useState<Partial<Record<keyof DishInput, string>>>({})
  const [deleteStep, setDeleteStep] = useState(0)

  const [dish, setDish] = useState<DishInput>(prep?.foods ? dishFromFood(prep.foods) : emptyDish)
  const [dishSourceId, setDishSourceId] = useState<string | null>(prep?.foods?.source_id ?? null)
  const [dishExtras, setDishExtras] = useState<ExtraInputs>(
    prep?.foods?.serving_g != null ? extrasPerServing(cleanExtras(prep.foods.extra_100g), Number(prep.foods.serving_g)) : {},
  )
  const [dishExtraErrors, setDishExtraErrors] = useState<Partial<Record<ExtraKey, string>>>({})

  const { profile } = useProfile()
  const savedDishes = useDishFoods()

  const changeField = <K extends keyof PrepFormInput>(field: K) => ({ target }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput({ ...input, [field]: target.value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  const changeDishField = <K extends keyof DishInput>(field: K) => ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setDish(prev => ({ ...prev, [field]: target.value }))
    if (dishErrors[field]) setDishErrors({ ...dishErrors, [field]: undefined })
  }

  const textareaClass = 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500'
  const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500'

  const saveMutation = useMutation({
    mutationFn: async (inputData: { fields: PrepFields; dishFood: FoodResult | null }) => {
      if (!profile?.household_id) throw new Error('Join or create a household first.')
      const householdId = profile.household_id
      const foodId = inputData.dishFood ? await saveDishFood(inputData.dishFood, householdId) : null

      if (prep) {
        await updatePrep(prep.id, { ...inputData.fields, food_id: foodId })
      } else {
        await insertPrep(householdId, profile.id, inputData.fields, foodId)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-prep'] })
      await queryClient.invalidateQueries({ queryKey: ['custom-foods'] })
      await queryClient.invalidateQueries({ queryKey: ['recent-foods'] })
      await queryClient.invalidateQueries({ queryKey: ['favorite-foods'] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePrep(prep!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-prep'] })
      onClose()
    },
  })

  // Validate first so each error shows under its own field.
  const save = () => {
    const parsed = parsePrepForm(input)
    setErrors(parsed.ok ? {} : parsed.errors)

    let dishFood: FoodResult | null = null
    const tempDishErrors: Partial<Record<keyof DishInput, string>> = {}

    if (!isDishBlank(dish)) {
      const parsedDish = parseDish(input.title.trim(), dish, dishSourceId ?? crypto.randomUUID())
      if (parsedDish.ok) {
        dishFood = parsedDish.food
      } else {
        Object.assign(tempDishErrors, parsedDish.errors)
      }
    }

    setDishErrors(tempDishErrors)

    if (!parsed.ok || Object.keys(tempDishErrors).length > 0) return

    if (dishFood !== null && dishFood.servingG != null) {
      const parsedExtra = parseExtraInputs(dishExtras, dishFood.servingG)
      if (!parsedExtra.ok) {
        setDishExtraErrors(parsedExtra.errors)
        return
      } else {
        setDishExtraErrors({})
        dishFood = { ...dishFood, extras100g: parsedExtra.extras100g }
      }
    }

    saveMutation.mutate({ fields: parsed.fields, dishFood })
  }

  const anyPending = saveMutation.isPending || deleteMutation.isPending
  const isSaveLoading = saveMutation.isPending
  const isDeleteLoading = deleteMutation.isPending

  const headingText = prep ? 'Edit prep session' : 'New prep session'

  return (
    <div className="bg-slate-900 rounded p-3 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 px-1">{headingText}</h2>

      {/* Name */}
      <div>
        <label htmlFor="prep-title" className="block text-gray-400 text-sm mb-1">Name</label>
        <input id="prep-title" type="text" value={input.title} onChange={changeField('title')} placeholder="What are you prepping?"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Date */}
      <div>
        <label htmlFor="prep-date" className="block text-gray-400 text-sm mb-1">Date</label>
        <input id="prep-date" type="date" value={input.date} onChange={(e) => { setInput({ ...input, date: e.target.value }); if (errors.date) setErrors({ ...errors, date: undefined }) }}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
      </div>

      {/* Start time */}
      <div>
        <label htmlFor="prep-time" className="block text-gray-400 text-sm mb-1">Start time</label>
        <input id="prep-time" type="time" value={input.startTime} onChange={changeField('startTime')}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        <p className="text-gray-600 text-xs mt-1">Optional</p>
        {errors.startTime && <p className="text-red-400 text-xs mt-1">{errors.startTime}</p>}
      </div>

      {/* Minutes & Servings side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="prep-minutes" className="block text-gray-400 text-sm mb-1">Minutes</label>
          <input id="prep-minutes" type="text" inputMode="numeric" value={input.duration} onChange={changeField('duration')} placeholder="60"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          {errors.duration && <p className="text-red-400 text-xs mt-1">{errors.duration}</p>}
        </div>
        <div>
          <label htmlFor="prep-servings" className="block text-gray-400 text-sm mb-1">Servings</label>
          <input id="prep-servings" type="text" inputMode="numeric" value={input.servings} onChange={changeField('servings')} placeholder="1"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          {errors.servings && <p className="text-red-400 text-xs mt-1">{errors.servings}</p>}
        </div>
      </div>

      {/* Nutrition per serving (optional) */}
      <div>
        <h3 className="text-gray-400 text-sm mb-2 px-1">Nutrition per serving (optional)</h3>

        {savedDishes.data && savedDishes.data.length > 0 && (
          <div className="mb-3">
            <label htmlFor="same-dish" className="block text-gray-400 text-sm mb-1">Same as a saved dish</label>
            <select id="same-dish" value={savedDishes.data.find(f => f.source_id === dishSourceId)?.id ?? ''}
              onChange={(e) => {
                const foodId = e.target.value
                if (!foodId) return
                const food = savedDishes.data!.find(f => f.id === foodId)
                if (food) {
                  setDish(dishFromFood(food))
                  setDishSourceId(food.source_id)
                  setDishExtras(food.serving_g != null ? extrasPerServing(cleanExtras(food.extra_100g), Number(food.serving_g)) : {})
                  setDishExtraErrors({})
                  if (!input.title.trim()) setInput({ ...input, title: food.name })
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">—</option>
              {savedDishes.data.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="dish-serving-g" className="block text-gray-400 text-sm mb-1">Serving weight (g)</label>
            <input id="dish-serving-g" type="text" inputMode="decimal" value={dish.servingG} onChange={changeDishField('servingG')} placeholder="350"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            {dishErrors.servingG && <p className="text-red-400 text-xs mt-1">{dishErrors.servingG}</p>}
          </div>
          <div>
            <label htmlFor="dish-kcal" className="block text-gray-400 text-sm mb-1">Calories</label>
            <input id="dish-kcal" type="text" inputMode="decimal" value={dish.kcal} onChange={changeDishField('kcal')} placeholder="520"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            {dishErrors.kcal && <p className="text-red-400 text-xs mt-1">{dishErrors.kcal}</p>}
          </div>
          <div>
            <label htmlFor="dish-protein" className="block text-gray-400 text-sm mb-1">Protein (g)</label>
            <input id="dish-protein" type="text" inputMode="decimal" value={dish.protein} onChange={changeDishField('protein')} placeholder="30"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            {dishErrors.protein && <p className="text-red-400 text-xs mt-1">{dishErrors.protein}</p>}
          </div>
          <div>
            <label htmlFor="dish-carbs" className="block text-gray-400 text-sm mb-1">Carbs (g)</label>
            <input id="dish-carbs" type="text" inputMode="decimal" value={dish.carbs} onChange={changeDishField('carbs')} placeholder="55"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            {dishErrors.carbs && <p className="text-red-400 text-xs mt-1">{dishErrors.carbs}</p>}
          </div>
          <div>
            <label htmlFor="dish-fat" className="block text-gray-400 text-sm mb-1">Fat (g)</label>
            <input id="dish-fat" type="text" inputMode="decimal" value={dish.fat} onChange={changeDishField('fat')} placeholder="20"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            {dishErrors.fat && <p className="text-red-400 text-xs mt-1">{dishErrors.fat}</p>}
          </div>
        </div>

        <ExtrasFields values={dishExtras} errors={dishExtraErrors} onChange={(key, value) => { setDishExtras({ ...dishExtras, [key]: value }); if (dishExtraErrors[key]) setDishExtraErrors({ ...dishExtraErrors, [key]: undefined }) }} />

        <p className="text-gray-500 text-xs mt-2 px-1">
          Weigh one portion or estimate it (a bowl of curry is about 350 g). It's saved as a custom food named after this session, so leftovers show up in Add food.
        </p>
      </div>

      {/* Recipe link */}
      <div>
        <label htmlFor="prep-url" className="block text-gray-400 text-sm mb-1">Recipe link</label>
        <input id="prep-url" type="url" value={input.recipeUrl} onChange={changeField('recipeUrl')} placeholder="https://example.com/recipe"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        <p className="text-gray-600 text-xs mt-1">Optional</p>
        {errors.recipeUrl && <p className="text-red-400 text-xs mt-1">{errors.recipeUrl}</p>}
      </div>

      {/* Ingredients */}
      <div>
        <label htmlFor="prep-ingredients" className="block text-gray-400 text-sm mb-1">Ingredients</label>
        <textarea id="prep-ingredients" rows={5} value={input.ingredients} onChange={changeField('ingredients')}
          placeholder="One per line, like 2 cup rice" className={textareaClass} />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="prep-notes" className="block text-gray-400 text-sm mb-1">Notes</label>
        <textarea id="prep-notes" rows={3} value={input.notes ?? ''} onChange={changeField('notes')} placeholder="Optional notes" className={textareaClass} />
      </div>

      {saveMutation.isError && <p className="text-red-400 text-sm px-1">{saveMutation.error.message}</p>}
      {deleteMutation.isError && <p className="text-red-400 text-sm px-1">{deleteMutation.error.message}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={save} disabled={anyPending}
          className="py-3 rounded font-semibold text-white flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-center">
          {isSaveLoading ? 'Saving…' : 'Save'}
        </button>

        {prep && (
          <button type="button" onClick={() => deleteStep === 0 ? setDeleteStep(1) : deleteMutation.mutate()} disabled={anyPending}
            className={`py-3 rounded font-semibold text-white flex-1 transition-colors ${
              isDeleteLoading
                ? 'bg-slate-600 cursor-not-allowed'
                : deleteStep === 1
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-700 hover:bg-slate-600'
            }`}>
            {isDeleteLoading ? 'Deleting…' : deleteStep === 1 ? 'Tap again to delete' : 'Delete'}
          </button>
        )}

        <button type="button" onClick={onClose} disabled={anyPending}
          className="py-3 rounded bg-slate-700 text-white font-semibold px-4 hover:bg-slate-600">
          Cancel
        </button>
      </div>
    </div>
  )
}
