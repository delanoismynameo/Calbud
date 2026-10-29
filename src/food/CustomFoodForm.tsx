import { useState } from 'react'
import type { FoodResult } from './types'
import type { CustomFoodInput } from './customFood'
import { parseCustomFood } from './customFood'
import type { ExtraInputs, ExtraKey } from './extras'
import { parseExtraInputs } from './extras'
import ExtrasFields from './ExtrasFields'
import { foodRow } from './rows'
import { supabase } from '../lib/supabase'
import { useProfile } from '../household/useProfile'
import { previewLabel } from './labelPreview'
import NutritionLabel from './NutritionLabel'
import { builtLabel } from './builtLabel'
import { recipeFood, recipeError } from './recipe'
import RecipeBuilder from './RecipeBuilder'
import type { Recipe } from './types'

const toggle = (on: boolean) =>
  `py-3 px-4 rounded font-semibold text-white flex-1 ${on ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`

interface CustomFoodFormProps {
  onSaved: (food: FoodResult) => void
  onCancel: () => void
}

export default function CustomFoodForm({ onSaved, onCancel }: CustomFoodFormProps) {
  const [input, setInput] = useState<CustomFoodInput>({
    name: '', servingLabel: '', servingG: '', kcal: '', protein: '', carbs: '', fat: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CustomFoodInput, string>>>({})
  const [extraInputs, setExtraInputs] = useState<ExtraInputs>({})
  const [extraErrors, setExtraErrors] = useState<Partial<Record<ExtraKey, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [mode, setMode] = useState<'numbers' | 'ingredients'>('numbers')
  const [recipe, setRecipe] = useState<Recipe>({ ingredients: [], yield: { kind: 'servings', servings: 1 } })
  const [recipeErr, setRecipeErr] = useState<string>('')
  const { profile } = useProfile()
  const householdId = profile?.household_id

  const change = (field: keyof CustomFoodInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput({ ...input, [field]: e.target.value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  const changeExtra = (key: ExtraKey, value: string) => {
    setExtraInputs({ ...extraInputs, [key]: value })
    if (extraErrors[key]) {
      setExtraErrors({ ...extraErrors, [key]: undefined })
    }
  }

  const handleSubmit = async () => {
    setSaveError('')
    // Ingredients mode saving logic
    if (mode === 'ingredients') {
      if (input.name.trim() === '') {
        setErrors({ name: 'Enter a name.' })
        return
      }
      const err = recipeError(recipe)
      if (err !== null) {
        setRecipeErr(err)
        return
      }
      const food = recipeFood(recipe, input.name, crypto.randomUUID())
      if (!householdId) { setSaveError('Join or create a household first.'); return }
      setSaving(true)
      const { error } = await supabase.from('foods').insert(foodRow(food, householdId))
      setSaving(false)
      if (error) { setSaveError(error.message); return }
      onSaved(food)
      return
    }

    // Numbers mode saving logic
    const result = parseCustomFood(input, crypto.randomUUID())
    const extras = result.ok ? parseExtraInputs(extraInputs, result.food.servingG!) : null
    setErrors(result.ok ? {} : result.errors)
    setExtraErrors(extras && !extras.ok ? extras.errors : {})
    if (!result.ok || !extras?.ok) return
    const food = { ...result.food, extras100g: extras.extras100g }
    if (!householdId) { setSaveError('Join or create a household first.'); return }
    setSaving(true)
    // Supabase reports failures in `error`; it doesn't throw.
    const { error } = await supabase.from('foods').insert(foodRow(food, householdId))
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    onSaved(food)
  }

  const fieldClass = 'w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500'

  const preview = previewLabel(input, extraInputs)

  // In ingredients mode, label preview as plain variables before return (null when error)
  const err = recipeError(recipe)
  const built: FoodResult | null = err === null ? recipeFood(recipe, input.name, 'preview') : null
  const label: { servingText: string; kcal: number; rows: LabelRow[] } | null = built !== null ? builtLabel(built) : null

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-400 px-1">Create a food</h2>

      <div className="flex gap-2">
        <button type="button" onClick={() => { setMode('numbers'); setRecipeErr('') }} className={toggle(mode === 'numbers')}>Type the numbers</button>
        <button type="button" onClick={() => { setMode('ingredients'); setRecipeErr('') }} className={toggle(mode === 'ingredients')}>Build from ingredients</button>
      </div>

      <div>
        <label htmlFor="cf-name" className="block text-gray-400 text-sm mb-1">Name</label>
        <input id="cf-name" type="text" value={input.name} onChange={change('name')}
          className={fieldClass} />
        {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
      </div>

      {mode === 'numbers' && (
        <>
          <div>
        <label htmlFor="cf-label" className="block text-gray-400 text-sm mb-1">Serving name</label>
        <input id="cf-label" type="text" value={input.servingLabel} onChange={change('servingLabel')}
          placeholder="1 serving" className={fieldClass} />
        {errors.servingLabel && <p className="text-red-400 text-xs">{errors.servingLabel}</p>}
      </div>

      <div>
        <label htmlFor="cf-weight" className="block text-gray-400 text-sm mb-1">Serving weight (g)</label>
        <input id="cf-weight" type="text" inputMode="decimal" value={input.servingG} onChange={change('servingG')}
          className={fieldClass} />
        {errors.servingG && <p className="text-red-400 text-xs">{errors.servingG}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="cf-kcal" className="block text-gray-400 text-sm mb-1">Calories</label>
          <input id="cf-kcal" type="text" inputMode="decimal" value={input.kcal} onChange={change('kcal')}
            className={fieldClass} />
          {errors.kcal && <p className="text-red-400 text-xs">{errors.kcal}</p>}
        </div>
        <div>
          <label htmlFor="cf-protein" className="block text-gray-400 text-sm mb-1">Protein (g)</label>
          <input id="cf-protein" type="text" inputMode="decimal" value={input.protein} onChange={change('protein')}
            className={fieldClass} />
          {errors.protein && <p className="text-red-400 text-xs">{errors.protein}</p>}
        </div>
        <div>
          <label htmlFor="cf-carbs" className="block text-gray-400 text-sm mb-1">Carbs (g)</label>
          <input id="cf-carbs" type="text" inputMode="decimal" value={input.carbs} onChange={change('carbs')}
            className={fieldClass} />
          {errors.carbs && <p className="text-red-400 text-xs">{errors.carbs}</p>}
        </div>
        <div>
          <label htmlFor="cf-fat" className="block text-gray-400 text-sm mb-1">Fat (g)</label>
          <input id="cf-fat" type="text" inputMode="decimal" value={input.fat} onChange={change('fat')}
            className={fieldClass} />
          {errors.fat && <p className="text-red-400 text-xs">{errors.fat}</p>}
        </div>
      </div>

      <p className="text-gray-500 text-xs">Per serving. An estimate is fine.</p>

      <ExtrasFields values={extraInputs} errors={extraErrors} onChange={changeExtra} />

      {preview && (
        <div>
          <p className="text-gray-400 text-sm mb-1">Label preview</p>
          <NutritionLabel servingText={preview.servingText} kcal={preview.kcal} rows={preview.rows} />
        </div>
      )}
        </>
      )}

      {mode === 'ingredients' && (
        <>
          <RecipeBuilder onChange={(r) => { setRecipe(r); setRecipeErr('') }} />

          {label && (
            <div>
              <p className="text-gray-400 text-sm mb-1">Label preview</p>
              <NutritionLabel servingText={label.servingText} kcal={label.kcal} rows={label.rows} />
            </div>
          )}

          {recipeErr && <p className="text-red-400 text-sm">{recipeErr}</p>}
        </>
      )}

      {saveError && <p className="text-red-400 text-sm">{saveError}</p>}

      <div className="space-y-2">
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white font-semibold">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-semibold">
          Cancel
        </button>
      </div>
    </div>
  )
}
