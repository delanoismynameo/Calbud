# 45: Build a prep dish from ingredients (and keep them when it's reopened)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for logging food and planning meal prep. A prep session (`src/prep/PrepForm.tsx`) can have a dish: today its nutrition is typed per serving. Add **Build from ingredients** there too, with the existing `RecipeBuilder`. An example is chicken thighs plus a sauce packet, divided into 4 servings or by the cooked weight of the pot. When a dish built that way is reopened, or picked again from "Same as a saved dish", its ingredients come back so one line can be changed.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Check your work by reading it. The reviewer runs the type check, `npm test` and `npm run build`, and clicks through it afterwards.

### Already done (don't redo)
- **`src/food/RecipeBuilder.tsx`:** `<RecipeBuilder initial={recipe} onChange={(r) => …} />`. `initial` is read **once**, when it mounts.
- **`src/food/recipe.ts`:** `recipeError(recipe)`, `recipeFood(recipe, name, id)`, `cleanRecipe(raw)` (reads a stored recipe, or null).
- **`src/food/builtLabel.ts`:** `builtLabel(food)` gives `{ servingText, kcal, rows }` for `NutritionLabel`.
- **Rows from the database** (`prep.foods`, and each item in `savedDishes.data`) are `FoodRowFromDb` from `src/food/recents.ts`. They have `recipe?: unknown`; read it with `cleanRecipe(row.recipe)`.
- **Saving:** `saveDishFood(food, householdId)` already saves a built food's recipe (via `foodRow`).

### Read only these files
- This file.
- `src/prep/PrepForm.tsx` (all of it).
- `src/food/recipe.ts` (only the exports' signatures), `src/food/builtLabel.ts`, `src/food/RecipeBuilder.tsx` (only its props).
- `src/food/CustomFoodForm.tsx`: only its mode toggle, the `toggle` helper, and the ingredients-mode label preview, to copy the same look.

### Changes, all in `src/prep/PrepForm.tsx`

**A. New state, at the top with the other hooks:**
- `const startRecipe = prep?.foods ? cleanRecipe(prep.foods.recipe) : null`, a plain variable before the hooks.
- `dishMode: 'numbers' | 'ingredients'`, starting `startRecipe ? 'ingredients' : 'numbers'`.
- `recipe: Recipe | null`, starting `startRecipe`.
- `builderKey: number`, starting `0`.
- `recipeErr: string`, starting `''`.

**No `useEffect`, `useMemo` or `useCallback`.**

**B. A dish mode toggle** right under the `Nutrition per serving (optional)` heading: **Type the numbers** and **Build from ingredients**, the same look as in `CustomFoodForm` (copy its `toggle` helper). Pressing one sets `dishMode` and clears `recipeErr`.

**C. "Same as a saved dish":** in its `onChange`, after the existing lines:
- `const saved = cleanRecipe(food.recipe)`
- If `saved`: `setRecipe(saved)`, `setDishMode('ingredients')`, `setBuilderKey((k) => k + 1)` (so the builder starts again from that recipe).
- Otherwise: `setRecipe(null)`, `setDishMode('numbers')`.

**D. In `'ingredients'` mode**, instead of the number fields, `ExtrasFields` and the numbers label preview, show:
- `<RecipeBuilder key={builderKey} initial={recipe ?? undefined} onChange={(r) => { setRecipe(r); setRecipeErr('') }} />`
- **A label preview:** when `recipe` has at least one ingredient and `recipeError(recipe)` is null, `builtLabel(recipeFood(recipe, input.title, 'preview'))`, worked out as a plain variable before the `return`. Show it with the same "Label preview" block as `CustomFoodForm`, in a `mt-3` div.
- `recipeErr` in `text-red-400 text-xs mt-1`, when not empty.

The existing help paragraph ("Weigh one portion…") stays in both modes.

**E. In `save`:** in `'ingredients'` mode, replace the dish part (the `isDishBlank` / `parseDish` block and the extras block) with:
- No `recipe`, or `recipe.ingredients.length === 0`: `dishFood = null` (no dish, as when the numbers are blank).
- Otherwise, when `recipeError(recipe)` is not null: `setRecipeErr` with it, and stop (after `setErrors` for the session fields, so every error shows at once).
- Otherwise: `dishFood = recipeFood(recipe, input.title.trim(), dishSourceId ?? crypto.randomUUID())`.

Then the existing `saveMutation.mutate({ fields: parsed.fields, dishFood })`. In `'numbers'` mode, `save` stays exactly as it is.

### Rules
- **Files:** change only `src/prep/PrepForm.tsx`. **Never edit any file under `docs/`**, and change no other file.
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** small edits. Keep JSX ternaries shallow: use `{dishMode === 'numbers' && (…)}` and `{dishMode === 'ingredients' && (…)}` blocks. Keep every hook before any early return. Import the existing helpers; do not write a second copy. Use `import type` for types.

### Done when
1. `PrepForm.tsx` does all of A to E, and numbers mode works exactly as before.
2. You have re-read this brief and checked each lettered part against your code.

Reply with: what you changed, and anything you were unsure about. Report only what you actually did.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, headless in the workspace-write sandbox (no npm).
- **Wall time:** about **7 min**, 28 steps. It stayed inside `PrepForm.tsx`.

## Result
- **Tests:** 397 passing. **Type check:** 1 error before my fix: it saved without checking `parsed.ok`.
- **Click-through** at 375 px against the mock:
  - **Building:** Prep → Plan → + Add, name "Chicken and sauce", **Build from ingredients**: 900 g of Oatmeal (standing in for chicken), then 1 serving of Greek yogurt (standing in for the packet). **Weigh the cooked dish**, 1200 g. The list reads "900 g · 639 cal" and "1 × 1 cup · 89 cal", "Total: 728 cal · 1050 g as weighed in", and the preview shows 100 g = 61 cal.
  - **Saving:** the mock's foods table has one "Chicken and sauce" with `kcal_100g` 60.67, `serving_g` null and a recipe of 2 ingredients, `{ kind: 'weight', totalG: 1200 }`.
  - **Reopening:** tapping the session shows both ingredients and 1200 in the weight box. Changing Oatmeal to 800 g and saving updates **the same** food (still one row; 54.75 cal per 100 g; first ingredient 800).
  - **Numbers mode:** still shows "More nutrients" and its preview (after my fix).

## What I changed
- **Broken numbers mode:** it had dropped `ExtrasFields` and the numbers label preview, which the brief said to keep. Both are back inside the numbers-mode block.
- **Save path:** it now returns when the session fields fail, after setting the recipe error, so every error still shows at once. That fixes the type error.
- **Types and layout:** removed a `rows: any[]` annotation, and moved the `toggle` helper out of the component.
- **`RecipeBuilder`:** the ingredient rows get a border. In the prep form they had the same background as the form, so the rows looked like loose text.

## Verdict
Usable after fixes. Again it removed code it was told to keep while rewrapping a block, and reported "nothing changed in numbers mode". When a brief moves JSX into a conditional block, list each element that must stay.
