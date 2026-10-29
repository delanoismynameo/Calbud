# 43: The `RecipeBuilder` component (ingredient list, amounts, how it's divided)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for logging food. People want to build a food from its ingredients: a yogurt bowl (yogurt + mandarin oranges + granola), or chicken cooked with a sauce packet. The logic exists (`src/food/recipe.ts`), and so does a food finder (`src/food/FoodFinder.tsx`). This task builds **one component**, `RecipeBuilder`, that lets someone:
- add ingredients with an amount,
- tap one to change its amount or remove it,
- say how the dish is divided.

The next tasks put it into the forms. **Do not change any other file.**

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Check your work by reading it. The reviewer runs the type check, `npm test` and `npm run build`, and clicks through it afterwards.

### Already done (don't redo)
- **`src/food/types.ts`:** `FoodResult`, `Ingredient` (`food`, `amount`, `unit: 'g' | 'serving'`), `RecipeYield` and `Recipe`.
- **`src/food/recipe.ts`:** `ingredientGrams(ing)`, `recipeTotals(ingredients)` (gives `grams`, `kcal` and more).
- **`src/food/FoodFinder.tsx`:** `<FoodFinder onPick={(food) => …} />` shows search, favorites, recents and a barcode scan. It calls `onPick` with the chosen food.
- **`src/food/ServingPicker.tsx`:** has the Servings / Grams toggle style to copy (the `toggle` class helper at the top).

### Read only these files
- This file.
- `src/food/types.ts` (only `FoodResult`, `Ingredient`, `RecipeYield`, `Recipe`), `src/food/recipe.ts` (only the exports' signatures), `src/food/FoodFinder.tsx` (only its props).
- `src/food/ServingPicker.tsx` lines 1–20, for the `toggle` helper.

### 1. `src/food/recipeDraft.ts` (new, pure)
```ts
import type { FoodResult, Ingredient, RecipeYield } from './types'

// Reading a typed number: trim, replace one ',' with '.', Number(). Usable when finite and > 0; otherwise null.
export function readAmount(text: string): number | null

// The starting amount text and unit for a newly picked food: '1' and 'serving' when food.servingG is set, otherwise '100' and 'g'.
export function startAmount(food: FoodResult): { text: string; unit: 'g' | 'serving' }

// One line of the list: `${amount} × ${servingLabel ?? 'serving'}` for unit 'serving' (e.g. '0.5 × 1 cup'), `${amount} g` for 'g';
// then ' · ' and the ingredient's kcal: Math.round(food.kcal100g * ingredientGrams(ing) / 100) + ' cal'.
export function ingredientLine(ing: Ingredient): string

// The yield from the form: mode 'servings' gives { kind: 'servings', servings: Number(text) };
// mode 'weight' gives { kind: 'weight', totalG: readAmount(text) ?? NaN }. (Invalid values are caught later by recipeError.)
export function yieldFrom(mode: 'servings' | 'weight', text: string): RecipeYield
```

### 2. `src/food/recipeDraft.test.ts` (new): one `it` each
Use the same `food(overrides)` helper style as `src/food/recipe.test.ts` (copy that helper into this test file).
1. `readAmount`: `'2'` → 2, `' 0,5 '` → 0.5, `''` → null, `'0'` → null, `'-1'` → null, `'abc'` → null.
2. `startAmount(food({ servingG: 150 }))` → `{ text: '1', unit: 'serving' }`; `startAmount(food({}))` → `{ text: '100', unit: 'g' }`.
3. `ingredientLine({ food: food({ kcal100g: 53, servingG: 196, servingLabel: '1 cup' }), amount: 0.5, unit: 'serving' })` → `'0.5 × 1 cup · 52 cal'` (53 × 98 / 100 = 51.94).
4. `ingredientLine({ food: food({ kcal100g: 471 }), amount: 30, unit: 'g' })` → `'30 g · 141 cal'`; with `servingG: 35` and no `servingLabel`, 1 `'serving'` of a 300 cal/100 g food → `'1 × serving · 105 cal'`.
5. `yieldFrom('servings', '4')` → `{ kind: 'servings', servings: 4 }`; `yieldFrom('weight', '1200')` → `{ kind: 'weight', totalG: 1200 }`; `yieldFrom('weight', '')` has `totalG` `NaN` (`Number.isNaN`).

**Never change a test's expected value to make it pass.**

### 3. `src/food/RecipeBuilder.tsx` (new)
```tsx
export default function RecipeBuilder({ initial, onChange }: { initial?: Recipe; onChange: (recipe: Recipe) => void })
```
It keeps its own state and calls `onChange` with the whole recipe after **every** change. It is not controlled from outside: `initial` is read once.

**State (all `useState`, all at the top):**
- `ingredients: Ingredient[]`, from `initial?.ingredients ?? []`.
- `mode: 'servings' | 'weight'`, from `initial?.yield.kind ?? 'servings'`.
- `yieldText: string`: `String(initial.yield.servings)` or `String(initial.yield.totalG)` when there is an initial recipe, otherwise `'1'`.
- `step: 'list' | 'finding' | 'amount'`, starting `'list'`.
- `editing: { food: FoodResult; index: number | null } | null`: the ingredient being added (`index` null) or changed.
- `amountText: string` and `unit: 'g' | 'serving'`, for the amount step.

**A helper** `const update = (nextIngredients: Ingredient[], nextMode = mode, nextText = yieldText) => { setIngredients(nextIngredients); setMode(nextMode); setYieldText(nextText); onChange({ ingredients: nextIngredients, yield: yieldFrom(nextMode, nextText) }) }`. Every change goes through it. **No `useEffect`, `useMemo` or `useCallback`.**

**`step === 'finding'`:**
- `<FoodFinder onPick={(food) => { const s = startAmount(food); setEditing({ food, index: null }); setAmountText(s.text); setUnit(s.unit); setStep('amount') }} />`.
- Under it, a **Cancel** button (`w-full py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-semibold`) that goes back to `'list'`.

**`step === 'amount'`** (and `editing` is set), in a `bg-slate-900 rounded-lg p-3 space-y-3` box:
- **Name:** the food's name in `font-semibold`, and its brand in `text-gray-400 text-sm` when there is one.
- **Unit toggle:** when `editing.food.servingG` is not null, the Servings / Grams toggle buttons, styled like ServingPicker's (copy its `toggle` helper into this file). Switching just sets `unit` and doesn't convert the number.
- **Amount:** an `<input id="ingredient-amount" type="text" inputMode="decimal">` for `amountText`, labelled `Servings` or `Grams` to match `unit`.
- **Error:** when `readAmount(amountText)` is null and the text is not empty, `Enter an amount above 0.` in `text-red-400 text-xs`.
- **Buttons**, in a `flex gap-2` row:
  - **Add** (when `index` is null) or **Save** (when changing): `flex-1 py-3 rounded font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600`, disabled while `readAmount(amountText)` is null. It builds `{ food: editing.food, amount, unit }`. That ingredient is added to the end, or replaces the one at `index`. Then `update(next)`, and go back to `'list'` with `editing` null.
  - **Remove** (only when changing): `py-3 px-4 rounded bg-red-900 text-white font-semibold`. It removes that ingredient with `update(…)`, then goes back to `'list'`.
  - **Cancel:** `py-3 px-4 rounded bg-slate-700 text-white font-semibold`. Goes back to `'list'` with nothing changed.

**`step === 'list'`**, in a `space-y-3` div:
- **Heading:** `Ingredients` in `text-sm font-semibold text-gray-400`.
- **Each ingredient:** a full-width button (`w-full bg-slate-900 rounded p-3 text-left hover:bg-slate-700`). Inside it:
  - the food's name in `font-semibold`;
  - `ingredientLine(ing)` in `text-gray-400 text-sm`.

  Tapping it opens the amount step for that ingredient: `editing = { food: ing.food, index: i }`, `amountText = String(ing.amount)`, `unit = ing.unit`.
- **No ingredients yet:** `No ingredients yet.` in `text-gray-500 text-sm`.
- **+ Add ingredient:** a `w-full py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800` button, which goes to `'finding'`.
- **Totals**, when there is at least one ingredient: `Total: ${t.kcal} cal · ${t.grams} g as weighed in`, from `const t = recipeTotals(ingredients)`, in `text-sm text-gray-300`.
- **How it's divided:**
  - a label `How is it divided?` (`text-sm text-gray-400`);
  - two toggle buttons, **Servings** and **Weigh the cooked dish** (same `toggle` style). Pressing one calls `update(ingredients, thatMode, thatMode === 'servings' ? '1' : '')`;
  - an `<input id="recipe-yield" type="text" inputMode="decimal">` for `yieldText`, labelled `How many servings` or `Cooked weight of the whole dish (g)`. Typing calls `update(ingredients, mode, e.target.value)`;
  - under it, in `text-gray-500 text-xs`: for servings, `Each serving is an equal share of everything above.`; for weight, `Weigh the pot's contents after cooking, without the pot. Then log the grams you eat.`.
- **Inputs** use `w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500`.

### Rules
- **Files:** create only `src/food/recipeDraft.ts`, `src/food/recipeDraft.test.ts` and `src/food/RecipeBuilder.tsx`. **Change no existing file. Never edit any file under `docs/`.**
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each file in one write, then fix with small edits. Keep JSX ternaries shallow: one `if` per step, each returning its own JSX, after all the hooks. Import `ingredientGrams` and `recipeTotals` from `./recipe`; do not write a second copy. Use `import type` for types.

### Done when
1. The three files exist as described.
2. You have re-read this brief and checked every test's expected value against your code by hand.

Reply with: the files created, and anything you were unsure about. Report only what you actually did.
