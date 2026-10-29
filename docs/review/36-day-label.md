# 36: The day's totals as a Nutrition Facts label

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for logging food. The Today page has a **More nutrients** panel (`src/today/MoreNutrients.tsx`) that opens to a plain list of the day's extra nutrients. Replace that list with the **Nutrition Facts label** the food screen already uses (`src/food/NutritionLabel.tsx`), filled with the whole day's totals.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Write the code carefully and check it by reading. The reviewer runs `npm test` and `npm run build` after you finish and may send you the output to fix.

### Already done (don't redo)
- **`src/food/label.ts`:** `LabelRow`, `LabelInput`, `formatAmount`, `labelRows(input)`. A row's `amount` is `null` when the extra is missing from `input.extras`.
- **`src/food/NutritionLabel.tsx`:** `NutritionLabel({ servingText, kcal, rows })`, display only.
- **`src/food/extras.ts`:** `ExtraKey`, `Extras`, `cleanExtras(raw)`, `sumExtras(list)` (for each extra: `{ info, total, missing }`, where `missing` is how many items had no value).
- **`src/today/totals.ts`:** `sumLogs(logs)` gives `{ kcal, protein_g, carbs_g, fat_g }`.
- **`src/today/types.ts`:** `MealLog` (with `extra?: Extras`).

### Read only these files
- This file.
- `src/food/label.ts`, `src/food/label.test.ts`, `src/food/NutritionLabel.tsx`.
- `src/food/extras.ts` (only `cleanExtras` and `sumExtras`), `src/today/totals.ts` (only `sumLogs`), `src/today/types.ts`, `src/today/MoreNutrients.tsx`.

### 1. `src/food/label.ts`: a missing count per row
- Add an optional field to `LabelRow`: `missing?: number`, how many of the foods added up had no value for this nutrient.
- Add an optional field to `LabelInput`: `missing?: Partial<Record<ExtraKey, number>>`.
- In `labelRows`: an extra row whose key has a count in `input.missing` that is above 0 gets `missing: thatCount`. Otherwise leave the field out (so the existing tests still pass unchanged). The macro rows never get it.

### 2. `src/food/NutritionLabel.tsx`
- New optional props: `servingName?: string` (the left text of the serving line; default `'Serving size'`) and `note?: string` (a `text-xs mt-1` line after the footnote, only when given).
- A row with an amount and `missing` above 0: after the amount, a `text-xs text-gray-500` span with ` (${missing} without data)`.
- Change nothing else about how it looks.

### 3. `src/today/dayNutrition.ts` (new)
```ts
import type { MealLog } from './types'
import type { LabelRow } from '../food/label'

// The day's label: kcal from sumLogs, the macros from sumLogs, and each extra from sumExtras over cleanExtras(log.extra):
//  an extra that no log has (missing === logs.length) is left out of `extras` (so its row says no data);
//  otherwise its total goes in `extras`, and when missing > 0 the count goes in `missing`.
// Returns { kcal, rows: labelRows(...) }.
export function dayNutrition(logs: MealLog[]): { kcal: number; rows: LabelRow[] }

// '1 food' or `${n} foods`.
export function foodCount(n: number): string
```

### 4. `src/today/dayNutrition.test.ts` (new): one `it` each
Helper `log(overrides)`: `id: 'l1'`, `user_id: 'me'`, `logged_on: '2026-10-29'`, `meal_type: 'lunch'`, `food_id: null`, `name: 'Rice'`, `quantity_g: 100`, `kcal: 130`, `protein_g: 2.7`, `carbs_g: 28`, `fat_g: 0.3`, `created_at: ''`, no `extra` unless given.
1. Two logs, `log({ extra: { sodium_mg: 100, fiber_g: 1 } })` and `log({ id: 'l2', kcal: 70, fat_g: 5, extra: { sodium_mg: 360 } })`: `kcal` is `200`; the Total Fat row's amount is `'5.3 g'`; the Sodium row's amount is `'460 mg'`, dv `20`, and it has no `missing` field (`toBeUndefined()`).
2. Same two logs: the Dietary Fiber row's amount is `'1 g'` and its `missing` is `1`.
3. Same two logs: the Cholesterol row's amount is `null` and it has no `missing` field.
4. One log with no `extra` at all: every extra row's amount is `null`, and Protein is `'2.7 g'`.
5. `[]`: `kcal` `0`, Total Fat `'0 g'`, every extra row's amount `null`.
6. `foodCount(1)` → `'1 food'`, `foodCount(3)` → `'3 foods'`.
7. In `src/food/label.test.ts`, add one test (and change no existing one): `labelRows({ ...input, missing: { sodium_mg: 2, sat_fat_g: 0 } })` gives the Sodium row `missing: 2`, and the Saturated Fat and Total Fat rows no `missing` field.

**Never change a test's expected value to make it pass.** If you think a value here is wrong, say so in your reply and leave the test as written.

### 5. `src/today/MoreNutrients.tsx`
- Keep the button, its `localStorage` key `calbud:more-nutrients`, and the open and closed behaviour. Change the button text to `Nutrition facts` (with the same ▴ / ▾).
- When open: replace the list of rows and the old `<p>` with
  `<div className="mt-2"><NutritionLabel servingName="Logged" servingText={foodCount(logs.length)} kcal={day.kcal} rows={day.rows} note="Foods logged before nutrients were added have no data." /></div>`, where `const day = dayNutrition(logs)` is a plain variable worked out before the `return`.
- Remove the imports that are no longer used. **No `useMemo` or `useCallback`.** Keep every hook before any early return.

### Rules
- **Files:**
  - create only `src/today/dayNutrition.ts` and `src/today/dayNutrition.test.ts`
  - change only `src/food/label.ts`, `src/food/label.test.ts` (one added test), `src/food/NutritionLabel.tsx` and `src/today/MoreNutrients.tsx`
  - **never edit any file under `docs/`**, and do not change `src/food/extras.ts` or `src/today/totals.ts`
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Import and use the existing helpers (`sumLogs`, `sumExtras`, `cleanExtras`, `labelRows`); do not write a second copy of anything that already exists. Use `import type` for types.

### Done when
1. The files above are written as described.
2. You have re-read this brief and checked every test's expected value against your code by hand (you cannot run the tests).

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.
