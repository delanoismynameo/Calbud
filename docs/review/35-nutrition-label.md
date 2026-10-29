# 35: A Nutrition Facts label on the food screen

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for logging food. When someone picks a food, `src/food/ServingPicker.tsx` shows it with an amount box, four tiles (Calories, Protein, Carbs, Fat) and a Log button. Add a **Nutrition Facts label** under it that looks like the black-and-white label on the back of a US food package, for the amount entered. Prep dishes open this same screen when logged, so they get it too.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Write the code carefully and check it by reading. The reviewer runs `npm test` and `npm run build` after you finish and may send you the output to fix.

### Already done (don't redo)
- **`src/food/extras.ts`:** `ExtraKey`, `Extras`, `EXTRAS` (each has `key`, `label`, `unit`, `dv`), `scaleExtras(extras100g, grams)` and `dvPercent(total, dv)`. Use them; do not change that file.
- **`src/food/nutrition.ts`:** `scaleNutrition(food, grams)` gives `{ kcal, protein_g, carbs_g, fat_g }`. `ServingPicker` already computes it as `nutrition` (null when the amount is invalid).
- **`FoodResult`** (`src/food/types.ts`) has `extras100g?: Extras` (per 100 g) and `servingLabel: string | null`.

### Read only these files
- This file.
- `src/food/extras.ts`, `src/food/types.ts`, `src/food/ServingPicker.tsx`.
- The first 20 lines of `src/food/extras.test.ts`, for the test style.

### 1. `src/food/label.ts` (new)
```ts
import type { ExtraKey, Extras } from './extras'

export type LabelKey = 'fat' | 'carbs' | 'protein' | ExtraKey

export interface LabelRow {
  key: LabelKey
  label: string
  amount: string | null   // formatted, e.g. '5 g'; null when there is no data
  dv: number | null       // % Daily Value; null when the nutrient has no DV or there is no data
  indent: 0 | 1 | 2
  bold: boolean
  group: 'main' | 'vitamins'
}

export interface LabelInput { fat_g: number; carbs_g: number; protein_g: number; extras: Extras }

// Under 10: rounded to one decimal, without a trailing '.0'. 10 or more: rounded to a whole number.
// Then a space and the unit. formatAmount(4.96, 'g') = '5 g', (0.46, 'g') = '0.5 g', (12.4, 'g') = '12 g', (0, 'mg') = '0 mg'.
export function formatAmount(value: number, unit: string): string

// The rows in label order. DVs for the three macros: fat 78 g, carbs 275 g, protein none.
// The extras' label text, unit and DV come from EXTRAS (look each up by key), except the label text, which is given below.
// The % uses dvPercent(rawValue, dv) on the raw (unformatted) value.
export function labelRows(input: LabelInput): LabelRow[]

// The "Serving size" line.
//  unit 'g': `${Math.round(grams)} g`
//  unit 'serving' with a servingLabel: `${amount} × ${servingLabel} (${Math.round(grams)} g)`
//  unit 'serving' without one: `${amount} serving (${Math.round(grams)} g)` when amount is '1', otherwise `${amount} servings (…)`
export function servingLine(unit: 'g' | 'serving', amount: string, grams: number, servingLabel: string | null): string
```
The rows, in this order (`key`, label text, indent, bold, group):

| key | label | indent | bold | group |
|---|---|---|---|---|
| fat | Total Fat | 0 | yes | main |
| sat_fat_g | Saturated Fat | 1 | no | main |
| trans_fat_g | Trans Fat | 1 | no | main |
| cholesterol_mg | Cholesterol | 0 | yes | main |
| sodium_mg | Sodium | 0 | yes | main |
| carbs | Total Carbohydrate | 0 | yes | main |
| fiber_g | Dietary Fiber | 1 | no | main |
| sugar_g | Total Sugars | 1 | no | main |
| added_sugar_g | Added Sugars | 2 | no | main |
| protein | Protein | 0 | yes | main |
| vit_d_mcg | Vitamin D | 0 | no | vitamins |
| calcium_mg | Calcium | 0 | no | vitamins |
| iron_mg | Iron | 0 | no | vitamins |
| potassium_mg | Potassium | 0 | no | vitamins |

An extra that is missing from `input.extras` gets `amount: null` and `dv: null`. The macros always have an amount.

### 2. `src/food/label.test.ts` (new): one `it` each
Use `const input = { fat_g: 39, carbs_g: 27.5, protein_g: 10, extras: { sat_fat_g: 5, sodium_mg: 460, fiber_g: 2.8, vit_d_mcg: 2 } }` and a helper `row(key)` that finds the row by key.
1. `formatAmount`: `(4.96, 'g')` → `'5 g'`, `(0.46, 'g')` → `'0.5 g'`, `(12.4, 'g')` → `'12 g'`, `(0, 'mg')` → `'0 mg'`, `(460, 'mg')` → `'460 mg'`, `(2.24, 'µg')` → `'2.2 µg'`.
2. `labelRows(input)` has 14 rows, and their keys are in the table's order.
3. Total Fat: amount `'39 g'`, dv `50`, indent 0, bold true.
4. Saturated Fat: `'5 g'`, dv `25`, indent 1, bold false.
5. Trans Fat, Cholesterol, Total Sugars, Added Sugars and Calcium: amount `null`, dv `null`.
6. Sodium `'460 mg'` dv `20`; Total Carbohydrate `'28 g'` dv `10`; Dietary Fiber `'2.8 g'` dv `10`.
7. Protein: `'10 g'`, dv `null`. Added Sugars has indent 2.
8. Vitamin D: `'2 µg'`, dv `10`, group `'vitamins'`; the last four rows have group `'vitamins'`, the first ten `'main'`.
9. With `extras: {}`, every extra row has amount `null`, and the three macros still have amounts.
10. `servingLine('g', '150', 150, null)` → `'150 g'`; `servingLine('serving', '1.5', 150, '1 cup')` → `'1.5 × 1 cup (150 g)'`; `servingLine('serving', '1', 30, null)` → `'1 serving (30 g)'`; `servingLine('serving', '2', 60, null)` → `'2 servings (60 g)'`.

**Never change a test's expected value to make it pass.** If you think a value here is wrong, say so in your reply and leave the test as written.

### 3. `src/food/NutritionLabel.tsx` (new)
```tsx
export default function NutritionLabel({ servingText, kcal, rows }: { servingText: string; kcal: number; rows: LabelRow[] })
```
Display only: no state, no hooks. Black on white, like a package:
- **Card:** `bg-white text-black rounded p-3 border-2 border-black`.
- **Heading:** `Nutrition Facts`, `text-3xl font-extrabold leading-none`, then a `border-b border-black pb-1`.
- **Serving line:** `flex justify-between text-sm font-bold`, left `Serving size`, right `servingText`, then a thick bar `border-b-8 border-black`.
- **Calories:** `flex justify-between items-end border-b-4 border-black`, left `Calories` in `text-2xl font-extrabold`, right `kcal` in `text-3xl font-extrabold`.
- **`% Daily Value*`:** `text-right text-xs font-bold border-b border-black`.
- **Each `main` row:** `flex justify-between text-sm border-b border-gray-400 py-0.5`; padding left `pl-4` for indent 1, `pl-8` for indent 2. Left: the label (in `font-bold` when bold) followed by a space and the amount, or `no data` in `text-gray-500` when the amount is null. Right: `${dv}%` in `font-bold` when `dv` is not null, otherwise nothing.
- **Between the groups:** a thick bar `border-b-8 border-black`, then the `vitamins` rows styled the same way.
- **Footnote:** `text-xs mt-1`: `* The % Daily Value shows how much of a day's amount the food gives, on a 2,000-calorie diet.`
- Keep JSX ternaries shallow: work out each row's text and classes in plain variables before the `return`, or in a small helper function.

### 4. `src/food/ServingPicker.tsx`
- Right after the last element inside the outer `div` (the `mutation.isError` line), add the label, only when `nutrition` is not null:
  `<NutritionLabel servingText={servingLine(unit, amount, grams, food.servingLabel)} kcal={nutrition.kcal} rows={labelRows({ fat_g: nutrition.fat_g, carbs_g: nutrition.carbs_g, protein_g: nutrition.protein_g, extras: scaleExtras(food.extras100g ?? {}, grams) })} />`
- Add the imports. Change nothing else in the file. **No `useMemo` or `useCallback`.**

### Rules
- **Files:**
  - create only `src/food/label.ts`, `src/food/label.test.ts` and `src/food/NutritionLabel.tsx`
  - change only `src/food/ServingPicker.tsx`
  - **never edit any file under `docs/`**, and do not change `src/food/extras.ts`
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Import and use the existing helpers (`EXTRAS`, `dvPercent`, `scaleExtras`); do not write a second copy of anything that already exists. Use `import type` for types.

### Done when
1. The three files exist and `ServingPicker.tsx` renders the label as in step 4.
2. You have re-read this brief and checked every row of the table and every test's expected value against your code by hand (you cannot run the tests).

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, run **headless** (`dsh --profile headless --patch calbud-local.yml headless --json`) in the default workspace-write sandbox, so it could not run npm. The brief said so and told it not to try. It didn't try. This was the first unattended run.
- **Wall time:** about **7 min**, 16 steps. It stayed inside the brief's files.
- **Outcome:** finished, and it reported "nothing unsure".

## Result
- **Builds:** yes. **Tests:** 309 passing (298 + 11). Every expected value held on the first try, even though it never ran the tests.
- **Click-through** at 375 px against the mock: Oatmeal, 1 cup (240 g) shows a black-on-white label with Calories 170, Sodium 118 mg 5%, Dietary Fiber 4.1 g 15%, Iron 2.2 mg 12%, and "no data" where the food has none. Switching to 100 g updates it (71 cal). Clearing the amount hides it.
- **Not tested:** a prep dish's Log button. It uses the same `ServingPicker`, so it gets the same label.

## What I changed
- **`labelRows`:** it built three hand-copied maps (labels, units, DVs) with one `EXTRAS.find` per key, about 100 lines. I replaced them with one row table and a single `EXTRAS` lookup. The tests are unchanged and pass.

## Verdict
Usable after a small tidy-up. Headless in the sandbox works: the model writes, and I run the tests and build. The repeated-code habit came back. Next time say "drive the rows from one table".
