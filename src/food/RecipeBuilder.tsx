import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Recipe, Ingredient, FoodResult } from './types'
import { recipeTotals } from './recipe'
import { yieldFrom, startAmount, readAmount, ingredientLine } from './recipeDraft'
import FoodFinder from './FoodFinder'
import { scaleNutrition } from './nutrition'
import { labelRows, servingLine } from './label'
import { scaleExtras } from './extras'
import NutritionLabel from './NutritionLabel'
import { applyLabelEdit, applyServingEdit } from './labelEdit'
import type { EditKey } from './labelEdit'
import ConvertPopup from './ConvertPopup'

const toggle = (active: boolean) => active
  ? 'flex-1 rounded-xl bg-card text-ink shadow-card font-bold py-2'
  : 'flex-1 py-2 text-muted'

export default function RecipeBuilder({ initial, onChange }: { initial?: Recipe; onChange: (recipe: Recipe) => void }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initial?.ingredients ?? [])
  const [mode, setMode] = useState<'servings' | 'weight'>((initial?.yield.kind as 'servings' | 'weight') ?? 'servings')
  const yieldDefault = initial ? (initial.yield.kind === 'servings' ? String(initial.yield.servings) : String(initial.yield.totalG)) : '1'
  const [yieldText, setYieldText] = useState<string>(yieldDefault)
  const [step, setStep] = useState<'list' | 'finding' | 'amount'>('list')
  const [editing, setEditing] = useState<{ food: FoodResult; index: number | null } | null>(null)
  const [edited, setEdited] = useState<FoodResult | null>(null)
  const [amountText, setAmountText] = useState('')
  const [unit, setUnit] = useState<'g' | 'serving'>('g')
  const [dishUnit, setDishUnit] = useState<'g' | 'ml'>((initial?.unit as 'g' | 'ml') ?? 'g')
  // The unit this ingredient is actually measured in — the food's own, so a drink defaults to ml.
  const [foodUnit, setFoodUnit] = useState<'g' | 'ml'>('g')

  const update = (nextIngredients: Ingredient[], nextMode = mode, nextText = yieldText, nextDishUnit = dishUnit) => {
    setIngredients(nextIngredients)
    setMode(nextMode)
    setYieldText(nextText)
    onChange({ ingredients: nextIngredients, yield: yieldFrom(nextMode, nextText), unit: nextDishUnit })
  }

  let body: ReactNode

  if (step === 'finding') {
    body = (
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
        className="space-y-3">
        <FoodFinder onPick={(food) => { const s = startAmount(food); setEditing({ food, index: null }); setEdited(null); setAmountText(s.text); setUnit(s.unit); setFoodUnit(food.unit); setStep('amount') }} />
        <button type="button" onClick={() => setStep('list')} className="w-full py-3 bg-coral-light hover:bg-coral-deep/10 text-link rounded-2xl font-semibold">Cancel</button>
      </div>
    )
  } else if (step === 'amount' && editing) {
    const amount = readAmount(amountText)
    const canSubmit = amount !== null

    // Use edited food if available, otherwise use the original from editing
    const shown = edited ?? editing.food

    let toggleMarkup: ReactNode = null
    if (shown.servingG != null) {
      const isServing = unit === 'serving'
      toggleMarkup = (
        <div className="flex gap-2">
          <button type="button" onClick={() => setUnit('serving')} className={toggle(isServing)}>Servings</button>
          <button type="button" onClick={() => setUnit('g')} className={toggle(!isServing)}>Grams</button>
        </div>
      )
    }

    // Calculate nutrition for the current amount
    let nutrition: { kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null = null
    let grams: number | null = null
    let servingText: string | null = null

    if (amount !== null && amount > 0) {
      const calculatedGrams = unit === 'serving' && shown.servingG != null ? amount * shown.servingG : amount
      if (calculatedGrams > 0 && calculatedGrams <= 5000) {
        grams = calculatedGrams
        nutrition = scaleNutrition(shown, grams)
        servingText = shown.servingG != null
          ? servingLine(unit, amountText, grams, shown.servingLabel, foodUnit)
          : `${Math.round(grams)} ${foodUnit}`
      }
    }

    const handleLabelEdit = (key: EditKey, value: number) => {
      if (grams != null) {
        const updated = applyLabelEdit(shown, key, value, grams)
        setEdited(updated)
      }
    }

    const handleServingEdit = (label: string, newGrams: number) => {
      const updated = applyServingEdit(shown, label, newGrams)
      setEdited(updated)
      setUnit('serving')
      setAmountText('1')
    }

    body = (
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
        className="space-y-3 bg-coral-light/50 rounded-2xl p-3">
        <div>
          <span className="font-semibold">{shown.name}</span>
          {shown.brand && <p className="text-muted text-sm">{shown.brand}</p>}
        </div>

        {toggleMarkup}

        <div className="flex items-center gap-2">
          <label htmlFor="ingredient-amount" className="block flex-1">
            <span className="text-muted text-xs">{unit === 'serving' ? 'Servings' : foodUnit === 'g' ? 'Grams' : 'Millilitres'}</span>
            <input id="ingredient-amount" type="text" inputMode="decimal" value={amountText}
              onChange={(e) => { setAmountText(e.target.value) }}
              className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-2 focus:outline-none focus:ring-2 focus:ring-coral" />
          </label>
          <ConvertPopup food={shown} onConvert={(converted) => setAmountText(String(converted))} />
        </div>

        {amountText.trim() !== '' && amount === null && (
          <p className="text-danger text-xs">Enter an amount above 0.</p>
        )}

        {nutrition && grams != null && servingText && (
          <NutritionLabel
            servingText={servingText}
            kcal={nutrition.kcal}
            rows={labelRows({
              fat_g: nutrition.fat_g,
              carbs_g: nutrition.carbs_g,
              protein_g: nutrition.protein_g,
              extras: scaleExtras(shown.extras100g ?? {}, grams),
            })}
            values={{
              kcal: nutrition.kcal,
              fat: nutrition.fat_g,
              carbs: nutrition.carbs_g,
              protein: nutrition.protein_g,
              ...scaleExtras(shown.extras100g ?? {}, grams),
            }}
            onEdit={handleLabelEdit}
            servingG={shown.servingG}
            servingLabel={shown.servingLabel}
            onEditServing={handleServingEdit}
          />
        )}

        <div className="flex gap-2">
          <button type="button" disabled={!canSubmit} onClick={() => {
            if (amount === null) return
            // Use the edited food if available, otherwise use the original
            const foodToUse = edited ?? editing.food
            const ing: Ingredient = { food: foodToUse, amount, unit }
            const next = editing.index !== null ? ingredients.map((item, i) => i === editing.index ? ing : item) : [...ingredients, ing]
            update(next)
            setEditing(null)
            setEdited(null)
            setStep('list')
          }} className="flex-1 py-3 rounded-2xl bg-coral-deep hover:bg-coral-deeper text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
            {editing.index !== null ? 'Save' : 'Add'}
          </button>

          {editing.index !== null && (
            <button type="button" onClick={() => {
              update(ingredients.filter((_, i) => i !== editing.index))
              setEditing(null)
              setEdited(null)
              setStep('list')
            }} className="py-3 px-4 rounded-xl text-danger font-semibold">Remove</button>
          )}

          <button type="button" onClick={() => { setEditing(null); setEdited(null); setStep('list') }}
            className="py-3 px-4 rounded-xl bg-coral-light hover:bg-coral-deep/10 text-link font-semibold">Cancel</button>
        </div>
      </div>
    )
  } else {
    // step === 'list'
    const totals = recipeTotals(ingredients)

    let ingredientList: ReactNode = null
    if (ingredients.length > 0) {
      ingredientList = (
        <div className="space-y-3">
          {ingredients.map((ing, i) => (
            <button key={i} type="button" onClick={() => { setEditing({ food: ing.food, index: i }); setEdited(null); setAmountText(String(ing.amount)); setUnit(ing.unit); setFoodUnit(ing.food.unit ?? 'g'); setStep('amount') }}
              className="w-full bg-coral-light/50 rounded-2xl p-3 text-left hover:bg-coral-light">
              <span className="font-semibold">{ing.food.name}</span>
              <p className="text-muted text-sm">{ingredientLine(ing)}</p>
            </button>
          ))}
        </div>
      )
    }

    let yieldMarkup: ReactNode = null
    if (ingredients.length > 0) {
      const servToggleActive = mode === 'servings'
      const weightToggleActive = mode === 'weight'
      yieldMarkup = (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted">How is it divided?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => update(ingredients, 'servings', '1')} className={servToggleActive ? toggle(true) : toggle(false)}>Servings</button>
            <button type="button" onClick={() => update(ingredients, 'weight', '')} className={weightToggleActive ? toggle(true) : toggle(false)}>Weigh the cooked dish</button>
          </div>
          {mode === 'servings' ? (
            <div>
              <label htmlFor="recipe-yield" className="text-muted text-xs">How many servings</label>
              <input id="recipe-yield" type="text" inputMode="decimal" value={yieldText}
                onChange={(e) => { update(ingredients, 'servings', e.target.value); }}
                className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-2 focus:outline-none focus:ring-2 focus:ring-coral" />
              <p className="text-muted text-xs">Each serving is an equal share of everything above.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="recipe-yield" className="text-muted text-xs">Cooked weight of the whole dish (g)</label>
              <input id="recipe-yield" type="text" inputMode="decimal" value={yieldText}
                onChange={(e) => { update(ingredients, 'weight', e.target.value); }}
                className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-2 focus:outline-none focus:ring-2 focus:ring-coral" />
              <p className="text-muted text-xs">Weigh the pot&apos;s contents after cooking, without the pot. Then log the grams you eat.</p>
            </div>
          )}
        </div>
      )
    }

    const dishChip = (active: boolean) =>
      `text-sm font-semibold px-3 py-1 rounded ${active ? 'bg-coral-deep text-white' : 'bg-coral-light/50 text-link hover:bg-coral-light'}`
    let dishUnitToggle: ReactNode = null
    if (ingredients.length > 0) {
      dishUnitToggle = (
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm">Measured in:</span>
          <button type="button" aria-pressed={dishUnit === 'g'} onClick={() => { setDishUnit('g'); update(ingredients, mode, yieldText, 'g') }}
            className={dishChip(dishUnit === 'g')}>g</button>
          <button type="button" aria-pressed={dishUnit === 'ml'} onClick={() => { setDishUnit('ml'); update(ingredients, mode, yieldText, 'ml') }}
            className={dishChip(dishUnit === 'ml')}>ml</button>
        </div>
      )
    }

    body = (
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
        className="space-y-3">
        <p className="text-sm font-semibold text-muted">Ingredients</p>
        {ingredientList ?? <p className="text-muted text-sm">No ingredients yet.</p>}
        <button type="button" onClick={() => setStep('finding')}
          className="w-full py-2 rounded border border-dashed border-line text-muted hover:bg-coral-light/50">+ Add ingredient</button>

        {ingredients.length > 0 && <p className="text-sm text-muted font-semibold">Total: {totals.kcal} cal · {totals.grams} g as weighed in</p>}
        {yieldMarkup}
        {dishUnitToggle}
      </div>
    )
  }

  return (
    <div>
      {body}
    </div>
  )
}
