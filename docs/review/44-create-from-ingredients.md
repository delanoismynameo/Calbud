# 44: "Build from ingredients" in Create a food

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for logging food. **Create a food** (`src/food/CustomFoodForm.tsx`) asks for the numbers per serving. Add a second way, **Build from ingredients**, using the existing `RecipeBuilder`. For example: yogurt + mandarin oranges + granola saved as one "Yogurt bowl", then logged in one tap.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Check your work by reading it. The reviewer runs the type check, `npm test` and `npm run build`, and clicks through it afterwards.

### Already done (don't redo)
- **`src/food/RecipeBuilder.tsx`:** `<RecipeBuilder onChange={(recipe) => …} />` holds the ingredient list and how the dish is divided. It calls `onChange` with the whole `Recipe` after every change.
- **`src/food/recipe.ts`:** `recipeError(recipe)` (a message, or null when it can be saved), `recipeFood(recipe, name, id)` (the `FoodResult` to save, with `recipe` attached).
- **`src/food/rows.ts`:** `foodRow(food, householdId)` already sends `recipe` for a built food.
- **`src/food/NutritionLabel.tsx`, `src/food/label.ts`, `src/food/nutrition.ts`, `src/food/extras.ts`:** `NutritionLabel`, `labelRows`, `scaleNutrition(food, grams)`, `scaleExtras(extras100g, grams)`.

### Read only these files
- This file.
- `src/food/CustomFoodForm.tsx` (all of it).
- `src/food/RecipeBuilder.tsx` (only its props), `src/food/recipe.ts` (only the exports' signatures).
- `src/food/ServingPicker.tsx` lines 1–20, for the `toggle` class helper.

### 1. `src/food/builtLabel.ts` (new, pure)
```ts
import type { FoodResult } from './types'
import type { LabelRow } from './label'

// The label for one serving of a built food (servingG set), or for 100 g when it is divided by weight (servingG null).
//  grams = food.servingG ?? 100
//  servingText: '1 serving (278 g)' with Math.round(grams), or '100 g' when servingG is null.
//  kcal and the macros from scaleNutrition(food, grams); rows from labelRows({ fat_g, carbs_g, protein_g, extras: scaleExtras(food.extras100g ?? {}, grams) }).
export function builtLabel(food: FoodResult): { servingText: string; kcal: number; rows: LabelRow[] }
```

### 2. `src/food/builtLabel.test.ts` (new): one `it` each
Build the food with `recipeFood` from `src/food/recipe.ts`, using the yogurt, mandarin and granola foods and the `bowl` ingredients from `src/food/recipe.test.ts`. Copy those definitions and the `food()` helper into this test file.
1. `builtLabel(recipeFood({ ingredients: bowl, yield: { kind: 'servings', servings: 1 } }, 'Bowl', 'b'))`: `servingText` `'1 serving (278 g)'`, `kcal` `282`, Total Fat amount `'6.9 g'`, Sodium amount `'56 mg'`.
2. The same ingredients with `yield: { kind: 'weight', totalG: 200 }`: `servingText` `'100 g'`, and `kcal` is `Math.round(282 / 200 * 100)`, which is `141`.

**Never change a test's expected value to make it pass.**

### 3. `src/food/CustomFoodForm.tsx`
**A. No more `<form>`.** The builder contains a barcode scanner, which has its own `<form>`, and forms can't be nested.
- Change the outer `<form onSubmit={handleSubmit} …>` into a `<div …>` with the same `className`.
- Make the **Save** button `type="button"` with `onClick={handleSubmit}`.
- Change `handleSubmit` to take no event (remove `e.preventDefault()` and the parameter).
- Change nothing else about how numbers mode looks or saves.

**B. New state, at the top with the other hooks:**
- `mode: 'numbers' | 'ingredients'`, starting `'numbers'`.
- `recipe: Recipe`, starting `{ ingredients: [], yield: { kind: 'servings', servings: 1 } }`.
- `recipeErr: string`, starting `''`.

**No `useEffect`, `useMemo` or `useCallback`.**

**C. A mode toggle** right under the heading: two buttons in a `flex gap-2` row, **Type the numbers** and **Build from ingredients**, using ServingPicker's `toggle` helper (copy it into this file). Pressing one sets `mode` and clears `recipeErr`.

**D. In `'ingredients'` mode, show only:**
1. the heading and the toggle;
2. the **Name** field, as it is now;
3. `<RecipeBuilder onChange={(r) => { setRecipe(r); setRecipeErr('') }} />`;
4. when `recipeError(recipe)` is null, a label preview: `const built = recipeFood(recipe, input.name, 'preview')` and `const label = builtLabel(built)`, worked out as plain variables before the `return` (use `null` when there is an error). Render `<div><p className="text-gray-400 text-sm mb-1">Label preview</p><NutritionLabel servingText={label.servingText} kcal={label.kcal} rows={label.rows} /></div>`;
5. `recipeErr` in `text-red-400 text-sm` when not empty;
6. `saveError`, and the Save and Cancel buttons, as now.

Hide the serving name, serving weight, the four number fields, the "Per serving" note, `ExtrasFields` and the numbers-mode label preview.

**E. Saving in `'ingredients'` mode** (at the top of `handleSubmit`, then `return` so numbers mode is untouched):
1. `setSaveError('')`.
2. When `input.name.trim()` is empty, set `errors` to `{ name: 'Enter a name.' }` and stop.
3. When `recipeError(recipe)` is not null, `setRecipeErr` with it and stop.
4. `const food = recipeFood(recipe, input.name, crypto.randomUUID())`.
5. The same household check, `saving` flag, `supabase.from('foods').insert(foodRow(food, householdId))`, error handling and `onSaved(food)` as numbers mode.

### Rules
- **Files:**
  - create only `src/food/builtLabel.ts` and `src/food/builtLabel.test.ts`
  - change only `src/food/CustomFoodForm.tsx`
  - **never edit any file under `docs/`**, and do not change `RecipeBuilder.tsx`, `recipe.ts` or `rows.ts`
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Keep JSX ternaries shallow: use `{mode === 'numbers' && (…)}` blocks. Import the existing helpers; do not write a second copy. Use `import type` for types.

### Done when
1. The files above are written as described, and numbers mode works exactly as before.
2. You have re-read this brief and checked both tests' expected values against your code by hand.

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.
