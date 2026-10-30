import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Recipe, Ingredient, FoodResult } from './types'
import { recipeTotals } from './recipe'
import { yieldFrom, startAmount, readAmount, ingredientLine } from './recipeDraft'
import FoodFinder from './FoodFinder'

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
  const [amountText, setAmountText] = useState('')
  const [unit, setUnit] = useState<'g' | 'serving'>('g')

  const update = (nextIngredients: Ingredient[], nextMode = mode, nextText = yieldText) => {
    setIngredients(nextIngredients)
    setMode(nextMode)
    setYieldText(nextText)
    onChange({ ingredients: nextIngredients, yield: yieldFrom(nextMode, nextText) })
  }

  let body: ReactNode

  if (step === 'finding') {
    body = (
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
        className="space-y-3">
        <FoodFinder onPick={(food) => { const s = startAmount(food); setEditing({ food, index: null }); setAmountText(s.text); setUnit(s.unit); setStep('amount') }} />
        <button type="button" onClick={() => setStep('list')} className="w-full py-3 bg-coral-light hover:bg-coral-deep/10 text-link rounded-2xl font-semibold">Cancel</button>
      </div>
    )
  } else if (step === 'amount' && editing) {
    const amount = readAmount(amountText)
    const canSubmit = amount !== null

    let toggleMarkup: ReactNode = null
    if (editing.food.servingG != null) {
      const isServing = unit === 'serving'
      toggleMarkup = (
        <div className="flex gap-2">
          <button type="button" onClick={() => setUnit('serving')} className={toggle(isServing)}>Servings</button>
          <button type="button" onClick={() => setUnit('g')} className={toggle(!isServing)}>Grams</button>
        </div>
      )
    }

    body = (
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
        className="space-y-3 bg-coral-light/50 rounded-2xl p-3">
        <div>
          <span className="font-semibold">{editing.food.name}</span>
          {editing.food.brand && <p className="text-muted text-sm">{editing.food.brand}</p>}
        </div>

        {toggleMarkup}

        <label htmlFor="ingredient-amount" className="block">
          <span className="text-muted text-xs">{unit === 'serving' ? 'Servings' : 'Grams'}</span>
          <input id="ingredient-amount" type="text" inputMode="decimal" value={amountText}
            onChange={(e) => { setAmountText(e.target.value); }}
            className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-2 focus:outline-none focus:ring-2 focus:ring-coral" />
        </label>

        {amountText.trim() !== '' && amount === null && (
          <p className="text-danger text-xs">Enter an amount above 0.</p>
        )}

        <div className="flex gap-2">
          <button type="button" disabled={!canSubmit} onClick={() => {
            if (amount === null) return
            const ing: Ingredient = { food: editing.food, amount, unit }
            const next = editing.index !== null ? ingredients.map((item, i) => i === editing.index ? ing : item) : [...ingredients, ing]
            update(next)
            setEditing(null)
            setStep('list')
          }} className="flex-1 py-3 rounded-2xl bg-coral-deep hover:bg-coral-deeper text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
            {editing.index !== null ? 'Save' : 'Add'}
          </button>

          {editing.index !== null && (
            <button type="button" onClick={() => {
              update(ingredients.filter((_, i) => i !== editing.index))
              setEditing(null)
              setStep('list')
            }} className="py-3 px-4 rounded-xl text-danger font-semibold">Remove</button>
          )}

          <button type="button" onClick={() => { setEditing(null); setStep('list') }}
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
            <button key={i} type="button" onClick={() => { setEditing({ food: ing.food, index: i }); setAmountText(String(ing.amount)); setUnit(ing.unit); setStep('amount') }}
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

    body = (
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
        className="space-y-3">
        <p className="text-sm font-semibold text-muted">Ingredients</p>
        {ingredientList ?? <p className="text-muted text-sm">No ingredients yet.</p>}
        <button type="button" onClick={() => setStep('finding')}
          className="w-full py-2 rounded border border-dashed border-line text-muted hover:bg-coral-light/50">+ Add ingredient</button>

        {ingredients.length > 0 && <p className="text-sm text-muted font-semibold">Total: {totals.kcal} cal · {totals.grams} g as weighed in</p>}
        {yieldMarkup}
      </div>
    )
  }

  return (
    <div>
      {body}
    </div>
  )
}
