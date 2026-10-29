# 37: A live Nutrition Facts preview while typing a food or a prep dish

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for logging food. Two forms let people type nutrition per serving: **Create a food** (`src/food/CustomFoodForm.tsx`) and the prep dish part of `src/prep/PrepForm.tsx`. Under each, show a **live preview** of the Nutrition Facts label (`src/food/NutritionLabel.tsx`, already used on the food screen) built from what has been typed so far, so filling in the form feels like filling in the back of a package.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Write the code carefully and check it by reading. The reviewer runs `npm test` and `npm run build` after you finish and may send you the output to fix.

### Already done (don't redo)
- **`src/food/label.ts`:** `LabelRow`, `labelRows({ fat_g, carbs_g, protein_g, extras })` (an extra missing from `extras` gives a row with `amount: null`).
- **`src/food/NutritionLabel.tsx`:** `NutritionLabel({ servingText, kcal, rows })`, display only.
- **`src/food/extras.ts`:** `ExtraKey`, `Extras`, `ExtraInputs` (per-serving values as typed, by key), `EXTRAS`.
- **The forms** already keep the typed text in state: `CustomFoodForm` has `input` (`name`, `servingLabel`, `servingG`, `kcal`, `protein`, `carbs`, `fat`) and `extraInputs`; `PrepForm` has `dish` (`servingG`, `kcal`, `protein`, `carbs`, `fat`) and `dishExtras`.

### Read only these files
- This file.
- `src/food/label.ts`, `src/food/NutritionLabel.tsx` (only its props), `src/food/extras.ts` (only the types and `EXTRAS`).
- `src/food/CustomFoodForm.tsx`, and in `src/prep/PrepForm.tsx` only the state at the top and the lines around `<ExtrasFields`.
- The first 20 lines of `src/food/label.test.ts`, for the test style.

### 1. `src/food/labelPreview.ts` (new)
```ts
import type { ExtraInputs } from './extras'
import type { LabelRow } from './label'

export interface PreviewInput { servingLabel: string; servingG: string; kcal: string; protein: string; carbs: string; fat: string }

// A label from the typed text, or null when calories are not a usable number yet.
//  Reading a number: trim, replace one ',' with '.', Number(); usable when finite and >= 0.
//  kcal: null result when not usable; otherwise Math.round(value).
//  protein / carbs / fat: 0 when not usable.
//  servingText: the trimmed servingLabel, or '1 serving' when blank; plus ` (${Math.round(g)} g)` when servingG is usable and above 0.
//  extras: each EXTRAS key whose typed value is usable goes in as that number (already per serving, no scaling); others are left out.
//  rows: labelRows({ fat_g, carbs_g, protein_g, extras }).
export function previewLabel(input: PreviewInput, extraInputs: ExtraInputs): { kcal: number; servingText: string; rows: LabelRow[] } | null
```
Write the number reading as one small private function in this file.

### 2. `src/food/labelPreview.test.ts` (new): one `it` each
Use `const base = { servingLabel: '1 bowl', servingG: '150', kcal: '250', protein: '10', carbs: '27,5', fat: '39' }` and a helper `row(rows, key)`.
1. `previewLabel(base, { sodium_mg: '460', fiber_g: '' })`: `kcal` `250`, `servingText` `'1 bowl (150 g)'`, Total Fat amount `'39 g'` dv `50`, Total Carbohydrate `'28 g'`, Sodium `'460 mg'`, Dietary Fiber amount `null`.
2. `kcal: ''`, `kcal: 'abc'` and `kcal: '-5'` each give `null`.
3. `protein: ''` gives Protein `'0 g'`; `fat: 'x'` gives Total Fat `'0 g'`.
4. `servingLabel: '', servingG: ''` gives `'1 serving'`; `servingLabel: '  ', servingG: '30'` gives `'1 serving (30 g)'`; `servingG: '0'` gives `'1 bowl'`.
5. Extras `{ iron_mg: '-1', calcium_mg: 'abc', potassium_mg: ' 300 ' }`: Iron and Calcium amounts `null`, Potassium `'300 mg'`.
6. `kcal: '99.6'` gives `kcal` `100`.

**Never change a test's expected value to make it pass.** If you think a value here is wrong, say so in your reply and leave the test as written.

### 3. `src/food/CustomFoodForm.tsx`
- Before the `return`, a plain variable: `const preview = previewLabel(input, extraInputs)`.
- Right after `<ExtrasFields … />`, when `preview` is not null:
  `<div><p className="text-gray-400 text-sm mb-1">Label preview</p><NutritionLabel servingText={preview.servingText} kcal={preview.kcal} rows={preview.rows} /></div>`
- Change nothing else.

### 4. `src/prep/PrepForm.tsx`
- Before the `return`, a plain variable: `const dishPreview = previewLabel({ ...dish, servingLabel: '' }, dishExtras)`.
- Right after its `<ExtrasFields … />`, the same block as in step 3 with `dishPreview`, with `className="mt-3"` on the outer `div`.
- Change nothing else. Keep every hook before any early return; **no `useMemo` or `useCallback`**.

### Rules
- **Files:**
  - create only `src/food/labelPreview.ts` and `src/food/labelPreview.test.ts`
  - change only `src/food/CustomFoodForm.tsx` and `src/prep/PrepForm.tsx`
  - **never edit any file under `docs/`**, and do not change `src/food/label.ts`, `src/food/NutritionLabel.tsx` or `src/food/extras.ts`
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Import and use the existing helpers (`labelRows`, `EXTRAS`); do not write a second copy of anything that already exists. Use `import type` for types.

### Done when
1. The files above are written as described.
2. You have re-read this brief and checked every test's expected value against your code by hand (you cannot run the tests).

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.
