# 41: Foods built from ingredients: the adding-up logic

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript app for logging food. People want to save a dish as one food built from its ingredients. Two examples:
- **A yogurt bowl:** yogurt, mandarin oranges and granola, eaten as one serving.
- **A batch:** chicken cooked with a sauce packet, divided into servings or by the cooked weight of the pot.

This task is **only the logic**, a pure TypeScript file plus its tests. No screen, no network.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Write the code carefully and check every number by hand. The reviewer runs the type check, `npm test` and `npm run build` after you finish.

### Already done (don't redo)
- **`src/food/types.ts`:** `FoodResult` (per-100 g values, `servingG`, optional `extras100g` and `recipe`), and `Ingredient`, `RecipeYield` and `Recipe`. Read their comments.
- **`src/food/extras.ts`:** `ExtraKey`, `Extras`, `EXTRAS`, `scaleExtras(extras100g, grams)` (rounds each value to 0.1) and `cleanExtras(raw)`.

### Read only these files
- This file.
- `src/food/types.ts`, `src/food/extras.ts` (only the types, `EXTRAS`, `scaleExtras` and `cleanExtras`).
- The first 20 lines of `src/food/label.test.ts`, for the test style.

### 1. `src/food/recipe.ts` (new)
```ts
import type { FoodResult, Ingredient, Recipe } from './types'
import type { ExtraKey, Extras } from './extras'

// unit 'g': amount. unit 'serving': amount * food.servingG, or amount when servingG is null.
export function ingredientGrams(ing: Ingredient): number

export interface RecipeTotals {
  grams: number                                // sum of ingredientGrams, rounded to 1 decimal
  kcal: number                                 // Math.round of the sum of kcal100g * g / 100
  protein_g: number; carbs_g: number; fat_g: number   // each the sum of value100g * g / 100, rounded to 1 decimal at the end
  extras: Extras                               // per key: the sum of scaleExtras(food.extras100g ?? {}, g) over the ingredients that have it, rounded to 1 decimal.
                                               // A key is present when at least one ingredient has it.
  missing: Partial<Record<ExtraKey, number>>   // for each key in `extras`: how many ingredients lack it, only when that is above 0
}
export function recipeTotals(ingredients: Ingredient[]): RecipeTotals

// The first problem, or null when the recipe can be saved. In this order:
//  no ingredients: 'Add at least one ingredient.'
//  an ingredient whose ingredientGrams is not finite, <= 0 or > 20000: 'Check the ingredient amounts.'
//  yield servings that is not a whole number from 1 to 100: 'Servings must be a whole number from 1 to 100.'
//  yield totalG that is not finite, <= 0 or > 20000: 'Enter the cooked weight in grams (1–20000).'
export function recipeError(recipe: Recipe): string | null

// The saved food, for a recipe that has no error. base = totals.grams for 'servings', yield.totalG for 'weight'.
//  Per 100 g: each of kcal, protein, carbs and fat, and each extra, is totals value / base * 100, rounded to 2 decimals.
//  source 'custom', sourceId = id, name = name.trim(), brand null, barcode null.
//  servings: servingG = totals.grams / servings rounded to 2 decimals, servingLabel '1 serving'.
//  weight:   servingG null, servingLabel null.
//  fiber100g, sugar100g, sodiumMg100g: extras100g.fiber_g, .sugar_g, .sodium_mg, or null when absent.
//  recipe: the given recipe, with each ingredient's food copied without its own `recipe` field.
export function recipeFood(recipe: Recipe, name: string, id: string): FoodResult

// Reads a stored recipe (from the database's jsonb). Returns null unless it is an object with:
//  ingredients: an array, every item having food (an object with a string `name` and finite numbers kcal100g, protein100g, carbs100g, fat100g),
//               a finite amount > 0, and unit 'g' or 'serving';
//  yield: { kind: 'servings', servings: finite number } or { kind: 'weight', totalG: finite number }.
// Returned ingredients keep their food as stored, but with extras100g passed through cleanExtras.
export function cleanRecipe(raw: unknown): Recipe | null
```
Write a small private `round(value, decimals)` helper for the rounding.

### 2. `src/food/recipe.test.ts` (new): one `it` each
Write a helper `food(overrides)` that returns a full `FoodResult`: `source: 'usda'`, `sourceId: 'x'`, `name: 'Food'`, `brand: null`, `servingG: null`, `servingLabel: null`, `kcal100g: 0`, `protein100g: 0`, `carbs100g: 0`, `fat100g: 0`, `fiber100g: null`, `sugar100g: null`, `sodiumMg100g: null`, `barcode: null`, then the overrides. Use these foods:
- `yogurt = food({ name: 'Yogurt', kcal100g: 59, protein100g: 10.2, carbs100g: 3.6, fat100g: 0.4, servingG: 150, extras100g: { sodium_mg: 36 } })`
- `mandarin = food({ name: 'Mandarin', kcal100g: 53, protein100g: 0.8, carbs100g: 13.3, fat100g: 0.3, servingG: 196, extras100g: { sodium_mg: 2, fiber_g: 1.8 } })`
- `granola = food({ name: 'Granola', kcal100g: 471, protein100g: 10, carbs100g: 64, fat100g: 20, extras100g: {} })`
- `chicken = food({ name: 'Chicken', kcal100g: 177, protein100g: 24, carbs100g: 0, fat100g: 8, extras100g: { sodium_mg: 95 } })`
- `packet = food({ name: 'Sauce packet', kcal100g: 300, protein100g: 5, carbs100g: 60, fat100g: 5, servingG: 35, extras100g: { sodium_mg: 4000 } })`

And `bowl = [{ food: yogurt, amount: 1, unit: 'serving' }, { food: mandarin, amount: 0.5, unit: 'serving' }, { food: granola, amount: 30, unit: 'g' }]`, `batch = [{ food: chicken, amount: 900, unit: 'g' }, { food: packet, amount: 1, unit: 'serving' }]`.

1. `ingredientGrams`: yogurt 1 serving → `150`; mandarin 0.5 serving → `98`; granola 30 g → `30`; granola 2 `'serving'` (no servingG) → `2`.
2. `recipeTotals(bowl)`: `grams` 278, `kcal` 282, `protein_g` 19.1, `carbs_g` 37.6, `fat_g` 6.9.
3. `recipeTotals(bowl).extras` equals `{ sodium_mg: 56, fiber_g: 1.8 }`, and `.missing` equals `{ sodium_mg: 1, fiber_g: 2 }`.
4. `recipeTotals(batch)`: `grams` 935, `kcal` 1698, `protein_g` 217.8, `carbs_g` 21, `fat_g` 73.8, `extras` `{ sodium_mg: 2255 }`, `missing` `{}`.
5. `recipeTotals([])`: grams 0, kcal 0, the three macros 0, `extras` `{}`, `missing` `{}`.
6. `recipeError`: `{ ingredients: [], yield: { kind: 'servings', servings: 1 } }` → `'Add at least one ingredient.'`; `bowl` with `servings: 0`, then `2.5`, then `101` → the servings message; `bowl` with `servings: 1` → `null`.
7. `recipeError`: `batch` with `{ kind: 'weight', totalG: 0 }` and with `25000` → the weight message; with `1200` → `null`; an ingredient of amount `0` → `'Check the ingredient amounts.'` (even with a bad yield too: the amounts are checked first).
8. `recipeFood({ ingredients: bowl, yield: { kind: 'servings', servings: 1 } }, ' Yogurt bowl ', 'r1')`: `name` `'Yogurt bowl'`, `source` `'custom'`, `sourceId` `'r1'`, `servingG` 278, `servingLabel` `'1 serving'`, `kcal100g` 101.44, `protein100g` 6.87, `sodiumMg100g` 20.14, `fiber100g` 0.65, `sugar100g` `null`, `extras100g` `{ sodium_mg: 20.14, fiber_g: 0.65 }`.
9. `recipeFood({ ingredients: batch, yield: { kind: 'weight', totalG: 1200 } }, 'Chicken', 'r2')`: `kcal100g` 141.5, `protein100g` 18.15, `servingG` `null`, `servingLabel` `null`, `extras100g.sodium_mg` 187.92.
10. `recipeFood({ ingredients: batch, yield: { kind: 'servings', servings: 4 } }, 'Chicken', 'r3')`: `servingG` 233.75, `kcal100g` 181.6.
11. `recipeFood` keeps the recipe: `.recipe.yield` equals the given yield, `.recipe.ingredients` has the same length, and an ingredient whose food had a `recipe` field is stored without it (`toBeUndefined()`).
12. `cleanRecipe(JSON.parse(JSON.stringify({ ingredients: bowl, yield: { kind: 'servings', servings: 1 } })))` deep-equals that same recipe.
13. `cleanRecipe` gives `null` for: `null`, `{}`, `{ ingredients: 'x', yield: { kind: 'servings', servings: 1 } }`, a recipe with an ingredient of `amount: 0`, a recipe with `unit: 'cup'`, a recipe with `yield: { kind: 'x' }`, and a recipe whose ingredient food has `kcal100g: 'a'`.

**Never change a test's expected value to make it pass.** If you work out that a value here is wrong, say so in your reply and leave the test as written.

### Rules
- **Files:** create only `src/food/recipe.ts` and `src/food/recipe.test.ts`. Change no existing file. **Never edit any file under `docs/`.**
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each file in one write, then fix with small edits. Use `scaleExtras`, `cleanExtras` and `EXTRAS`; do not write a second copy of anything that already exists. Use `import type` for types. Keep each function small.

### Done when
1. The two files exist as described.
2. You have re-read this brief and checked every test's expected value against your code by hand.

Reply with: the files created, and anything you were unsure about. Report only what you actually did.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, headless in the workspace-write sandbox (no npm).
- **Wall time:** about **8 min**, 9 steps. It stayed inside the brief's files.
- **Outcome:** finished. It flagged two doubts of its own: test 8's `missing` values, and not running `cleanExtras` in `cleanRecipe`. The second was a real gap.

## Result
- **Before my fixes:** 2 type errors (`RecipeYield` not imported, a possibly-undefined `extras100g`) and 3 failing tests, all in `recipeFood`.
- **After:** type check clean, 29 recipe tests passing.

## What I changed
I rewrote `recipe.ts` against the brief. The tests were mostly right.
- **`recipeFood` extras:** it stored the dish's *total* extras as `extras100g`, so sodium read 56 instead of 20.14 per 100 g. Each extra is now divided per 100 g like the macros.
- **`recipeError`:** it checked the typed `amount`, not `ingredientGrams`. So 600 servings of a 35 g packet (21 kg) would have passed.
- **Type workarounds:** `recipe: undefined as any`, and `return false as any` inside `cleanRecipe`, which returned `false` instead of `null`. Both are gone.
- **`cleanRecipe`:** it now passes each stored ingredient's extras through `cleanExtras`, as briefed, and is split into small `cleanYield` and `cleanIngredient` helpers.
- **`recipeTotals`:** it no longer crashes when an ingredient has no `extras100g`.
- **Tests:** added the brief's missing check that bad amounts are reported before a bad yield.

## Verdict
Usable after a rewrite of the main file. Every expected value in the brief was right; the code just didn't reach them. With no test runner, the 35B guesses at the hard parts and reports doubts instead of finishing them. For logic this dense, the 27B (which can't run tests either) or a brief with smaller steps may do better.
