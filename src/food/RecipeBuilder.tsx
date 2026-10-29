import { useState } from 'react'
import type { Recipe, Ingredient, FoodResult } from './types'
import { recipeTotals, ingredientGrams } from './recipe'
import { yieldFrom, startAmount, readAmount } from './recipeDraft'
import FoodFinder from './FoodFinder'

const toggle = (on: boolean) =>
  `py-3 px-4 rounded font-semibold text-white flex-1 ${on ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`

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

  let body: JSX.Element

  if (step === 'finding') {
    body = (
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}>
        <FoodFinder onPick={(food) => { const s = startAmount(food); setEditing({ food, index: null }); setAmountText(s.text); setUnit(s.unit); setStep('amount') }} />
        <button type="button" onClick={() => setStep('list')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-semibold">Cancel</button>
      </div>
    )
  } else if (step === 'amount' && editing) {
    const amount = readAmount(amountText)
    const canSubmit = amount !== null

    let toggleMarkup: JSX.Element | null = null
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
        className="bg-slate-900 rounded-lg p-3 space-y-3">
        <div>
          <span className="font-semibold">{editing.food.name}</span>
          {editing.food.brand && <p className="text-gray-400 text-sm">{editing.food.brand}</p>}
        </div>

        {toggleMarkup}

        <label htmlFor="ingredient-amount" className="block">
          <span className="text-gray-400 text-xs">{unit === 'serving' ? 'Servings' : 'Grams'}</span>
          <input id="ingredient-amount" type="text" inputMode="decimal" value={amountText}
            onChange={(e) => { setAmountText(e.target.value); }}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        </label>

        {amountText.trim() !== '' && amount === null && (
          <p className="text-red-400 text-xs">Enter an amount above 0.</p>
        )}

        <div className="flex gap-2">
          <button type="button" disabled={!canSubmit} onClick={() => {
            const ing: Ingredient = { food: editing.food, amount, unit }
            const next = editing.index !== null ? ingredients.map((item, i) => i === editing.index ? ing : item) : [...ingredients, ing]
            update(next)
            setEditing(null)
            setStep('list')
          }} className="flex-1 py-3 rounded font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600">
            {editing.index !== null ? 'Save' : 'Add'}
          </button>

          {editing.index !== null && (
            <button type="button" onClick={() => {
              update(ingredients.filter((_, i) => i !== editing.index))
              setEditing(null)
              setStep('list')
            }} className="py-3 px-4 rounded bg-red-900 text-white font-semibold">Remove</button>
          )}

          <button type="button" onClick={() => { setEditing(null); setStep('list') }}
            className="py-3 px-4 rounded bg-slate-700 text-white font-semibold">Cancel</button>
        </div>
      </div>
    )
  } else {
    // step === 'list'
    const totals = recipeTotals(ingredients)

    let ingredientList: JSX.Element | null = null
    if (ingredients.length > 0) {
      ingredientList = (
        <div className="space-y-3">
          {ingredients.map((ing, i) => (
            <button key={i} type="button" onClick={() => { setEditing({ food: ing.food, index: i }); setAmountText(String(ing.amount)); setUnit(ing.unit); setStep('amount') }}
              className="w-full bg-slate-900 rounded p-3 text-left hover:bg-slate-700">
              <span className="font-semibold">{ing.food.name}</span>
              <p className="text-gray-400 text-sm">{ingredientLine(ing)}</p>
            </button>
          ))}
        </div>
      )
    }

    let yieldMarkup: JSX.Element | null = null
    if (ingredients.length > 0) {
      const servToggleActive = mode === 'servings'
      const weightToggleActive = mode === 'weight'
      yieldMarkup = (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">How is it divided?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => update(ingredients, 'servings', '1')} className={servToggleActive ? toggle(true) : toggle(false)}>Servings</button>
            <button type="button" onClick={() => update(ingredients, 'weight', '')} className={weightToggleActive ? toggle(true) : toggle(false)}>Weigh the cooked dish</button>
          </div>
          {mode === 'servings' ? (
            <div>
              <label htmlFor="recipe-yield" className="text-gray-400 text-xs">How many servings</label>
              <input id="recipe-yield" type="text" inputMode="decimal" value={yieldText}
                onChange={(e) => { update(ingredients, 'servings', e.target.value); }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              <p className="text-gray-500 text-xs">Each serving is an equal share of everything above.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="recipe-yield" className="text-gray-400 text-xs">Cooked weight of the whole dish (g)</label>
              <input id="recipe-yield" type="text" inputMode="decimal" value={yieldText}
                onChange={(e) => { update(ingredients, 'weight', e.target.value); }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              <p className="text-gray-500 text-xs">Weigh the pot&apos;s contents after cooking, without the pot. Then log the grams you eat.</p>
            </div>
          )}
        </div>
      )
    }

    body = (
      <div onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
        className="space-y-3">
        <p className="text-sm font-semibold text-gray-400">Ingredients</p>
        {ingredientList ?? <p className="text-gray-500 text-sm">No ingredients yet.</p>}
        <button type="button" onClick={() => setStep('finding')}
          className="w-full py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800">+ Add ingredient</button>

        {ingredients.length > 0 && <p className="text-sm text-gray-300">Total: {totals.kcal} cal · {totals.grams} g as weighed in</p>}
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
