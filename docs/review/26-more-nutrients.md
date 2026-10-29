# 26: More nutrients (the Nutrition Facts label set)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Right now a logged food records only calories, protein, carbs and fat. Your job: also keep the **extra nutrients** that USDA and Open Food Facts report, and show the day's totals on Today.

The extra nutrients are the US Nutrition Facts label set. There are 11 of them:
- saturated fat, trans fat, cholesterol, sodium
- fiber, sugar, added sugar
- vitamin D, calcium, iron, potassium

**A nutrient a food doesn't report is missing, never zero.**

### Already done (don't redo)
- **The columns:**
  - `foods.extra_100g` is a `jsonb` object of amounts per 100 g, such as `{"sodium_mg": 49, "iron_mg": 0.9}`
  - `meal_logs.extra` is a `jsonb` object of the amounts for the logged quantity
  - both default to `{}`
- **Where the data comes from:**
  - `normalizeUsdaFood` in `src/food/usda.ts` already builds a `Map<number, number>` of USDA nutrient id → value per 100 g, called `nutrients`
  - `normalizeOffProduct` in `src/food/off.ts` already has the `nutriments` object

### Read only these files
- This file.
- **Food:** `src/food/types.ts`, `src/food/usda.ts`, `src/food/off.ts`, `src/food/rows.ts`, `src/food/rows.test.ts`, `src/food/recents.ts`.
- **Today:** `src/today/types.ts`, `src/today/totals.ts`, `src/today/day.ts`, `src/today/mealLogApi.ts`, `src/pages/Today.tsx`, `src/today/MacroBar.tsx`.
- **For the test style:** the first 25 lines of `src/today/totals.test.ts`, and the first 30 lines of `src/today/day.test.ts`.

### Write in this order. Run `npm test` after step 1 before you continue.

### 1. `src/food/extras.ts` and `src/food/extras.test.ts`
```ts
export type ExtraKey = 'sat_fat_g' | 'trans_fat_g' | 'cholesterol_mg' | 'sodium_mg' | 'fiber_g' | 'sugar_g'
  | 'added_sugar_g' | 'vit_d_mcg' | 'calcium_mg' | 'iron_mg' | 'potassium_mg'
export type Extras = Partial<Record<ExtraKey, number>>
export interface ExtraInfo { key: ExtraKey; label: string; unit: 'g' | 'mg' | 'µg'; dv: number | null; usda: number; off: string; offScale: number }
export const EXTRAS: ExtraInfo[]
export function extrasFromUsda(nutrients: Map<number, number>): Extras
export function extrasFromOff(nutriments: Record<string, unknown>): Extras
export function cleanExtras(raw: unknown): Extras
export function scaleExtras(extras: Extras, grams: number): Extras
export function sumExtras(list: Extras[]): { info: ExtraInfo; total: number; missing: number }[]
export function dvPercent(total: number, dv: number | null): number | null
```
**`EXTRAS`**, in exactly this order:

| key | label | unit | dv | usda | off | offScale |
|---|---|---|---|---|---|---|
| `sat_fat_g` | Saturated fat | g | 20 | 1258 | `saturated-fat_100g` | 1 |
| `trans_fat_g` | Trans fat | g | null | 1257 | `trans-fat_100g` | 1 |
| `cholesterol_mg` | Cholesterol | mg | 300 | 1253 | `cholesterol_100g` | 1000 |
| `sodium_mg` | Sodium | mg | 2300 | 1093 | `sodium_100g` | 1000 |
| `fiber_g` | Fiber | g | 28 | 1079 | `fiber_100g` | 1 |
| `sugar_g` | Sugar | g | null | 2000 | `sugars_100g` | 1 |
| `added_sugar_g` | Added sugar | g | 50 | 1235 | `added-sugars_100g` | 1 |
| `vit_d_mcg` | Vitamin D | µg | 20 | 1114 | `vitamin-d_100g` | 1000000 |
| `calcium_mg` | Calcium | mg | 1300 | 1087 | `calcium_100g` | 1000 |
| `iron_mg` | Iron | mg | 18 | 1089 | `iron_100g` | 1000 |
| `potassium_mg` | Potassium | mg | 4700 | 1092 | `potassium_100g` | 1000 |

(Open Food Facts gives every `_100g` amount in grams, so mg needs ×1000 and µg needs ×1000000.)

- **`extrasFromUsda`:** for each entry whose `usda` id is in the map, set `key` to the value rounded to 2 decimals (`Math.round(v * 100) / 100`). Skip ids that aren't in the map.
- **`extrasFromOff`:**
  - for each entry, read `nutriments[off]`
  - accept a number, or a string that `Number()` turns into a number; the value must be finite and `>= 0`
  - multiply by `offScale`, round to 2 decimals, and set `key`
  - skip anything else
- **`cleanExtras`:**
  - if `raw` isn't a non-null, non-array object, return `{}`
  - otherwise keep only the `EXTRAS` keys whose value is a finite `number` `>= 0`
- **`scaleExtras`:** each present key becomes `Math.round(v * grams / 100 * 10) / 10`.
- **`sumExtras`:** one item per `EXTRAS` entry, in order:
  - `total` is the sum of the values present, rounded with `Math.round(x * 10) / 10`
  - `missing` is how many items in `list` don't have that key
- **`dvPercent`:** `null` when `dv` is null, otherwise `Math.round(total / dv * 100)`.

Tests, one `it` each:
1. `EXTRAS` has 11 entries, its keys are all different, the first key is `'sat_fat_g'`, and the `sodium_mg` entry's `dv` is `2300`.
2. `extrasFromUsda(new Map([[1093, 3], [1258, 0.698], [1114, 0], [1110, 0], [1087, 22], [1003, 3.89]]))` equals `{ sodium_mg: 3, sat_fat_g: 0.7, vit_d_mcg: 0, calcium_mg: 22 }`.
3. `extrasFromOff({ 'sodium_100g': 0.0428, 'sugars_100g': 56.3, 'added-sugars_100g': 52.13, 'fiber_100g': 0, 'salt_100g': 0.107, 'iron_100g': '0.0012', 'calcium_100g': 'abc' })` equals `{ sodium_mg: 42.8, sugar_g: 56.3, added_sugar_g: 52.13, fiber_g: 0, iron_mg: 1.2 }`.
4. `extrasFromOff({ 'vitamin-d_100g': 0.0000025, 'cholesterol_100g': -1 })` equals `{ vit_d_mcg: 2.5 }`.
5. `cleanExtras({ sodium_mg: 120, foo: 3, iron_mg: -1, fiber_g: 'x', sugar_g: 0 })` equals `{ sodium_mg: 120, sugar_g: 0 }`. `cleanExtras(null)`, `cleanExtras([1])` and `cleanExtras(undefined)` each equal `{}`.
6. `scaleExtras({ sodium_mg: 49, iron_mg: 0.9 }, 240)` equals `{ sodium_mg: 117.6, iron_mg: 2.2 }`, and `scaleExtras({}, 100)` equals `{}`.
7. For `r = sumExtras([{ sodium_mg: 117.6, fiber_g: 4.1 }, {}, { sodium_mg: 30 }])`:
   - `r.length` is `11`, and `r[0].info.key` is `'sat_fat_g'`
   - the `sodium_mg` item has `total: 147.6, missing: 1`
   - `fiber_g` has `total: 4.1, missing: 2`
   - `iron_mg` has `total: 0, missing: 3`
8. `dvPercent(1150, 2300)` is `50`, `dvPercent(5, null)` is `null`, and `dvPercent(0, 20)` is `0`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written. **The one allowed exception** is in step 4.

### 2. Types
- **`src/food/types.ts`:** `FoodResult` gains `extras100g?: Extras`. It's **optional**, so existing objects stay valid.
- **`src/today/types.ts`:** `MealLog` gains `extra?: Extras`, also optional.
- **`src/food/recents.ts`:** `FoodRowFromDb` gains `extra_100g?: unknown`. `foodResultFromRow` sets `extras100g: cleanExtras(row.extra_100g)`.

### 3. Sources
- **`src/food/usda.ts`:** the returned object gains `extras100g: extrasFromUsda(nutrients)`.
- **`src/food/off.ts`:** the returned object gains `extras100g: extrasFromOff(nutriments)`.
- Keep `fiber100g`, `sugar100g` and `sodiumMg100g` as they are.

### 4. `src/food/rows.ts`
- **`FoodRow`** gains `extra_100g: Extras`, and `foodRow` sets it to `food.extras100g ?? {}`. Put it **last**.
- **`MealLogRow`** gains `extra: Extras`, and `mealLogRow` sets it to `scaleExtras(food.extras100g ?? {}, grams)`.
- **In `src/food/rows.test.ts`, and only there:**
  - add `'extra_100g'` at the end of `ALL_KEYS`
  - rename the test `has exactly the 14 column keys` to `has exactly the 15 column keys`
  - this is the one allowed change to an existing test
- **Add a new test** to `rows.test.ts`: `mealLogRow` for `{ ...FOOD, extras100g: { sodium_mg: 49 } }` at 240 g gives `extra` equal to `{ sodium_mg: 117.6 }`.

### 5. Copying and editing keep the extras
- **`src/today/day.ts`, `copyRows`:** add `...(log.extra ? { extra: log.extra } : {})` to each row. Rows without `extra` must stay exactly as they are now, so the existing tests still pass.
- **A new test in `day.test.ts`:** `copyRows([log({ extra: { sodium_mg: 5 } })], '2026-10-28')[0].extra` equals `{ sodium_mg: 5 }`.
- **`src/today/totals.ts`, `rescaleLog`:**
  - add `...(log.extra ? { extra: scaleExtras(log.extra, grams / log.quantity_g * 100) } : {})` to the returned object
  - that scales every extra by the same factor as kcal
- **A new test in `totals.test.ts`:** `rescaleLog(log({ quantity_g: 200, extra: { sodium_mg: 100 } }), 300).extra` equals `{ sodium_mg: 150 }`.
- **`src/today/mealLogApi.ts`:** `updateMealLog`'s `changes` type also allows `extra`.

### 6. `src/today/MoreNutrients.tsx`
`export default function MoreNutrients({ logs }: { logs: MealLog[] })`
- **The `open` state:**
  - it starts from `localStorage.getItem('calbud:more-nutrients') === '1'`
  - toggling saves `'1'` or `'0'`
  - wrap both in `try/catch`; on failure, just keep the state in memory
- **The toggle:** a full-width, left-aligned button, `text-sm text-blue-400`, reading `` `More nutrients ${open ? '▴' : '▾'}` `` with `aria-expanded={open}`.
- **When open:**
  - `rows = sumExtras(logs.map((l) => cleanExtras(l.extra)))`
  - one line per row, `flex justify-between text-sm`: the `info.label` in grey on the left, and the amount on the right
  - **the amount:**
    - if `missing === logs.length`, a grey `—`
    - otherwise `` `${total} ${info.unit}` ``, followed by `` ` · ${pct}%` `` when `dvPercent(total, info.dv)` isn't null
    - when `missing > 0`, also add a small grey `` ` (${missing} without data)` ``
  - **under the list,** a grey `text-xs` hint: `% of the daily value on US food labels. Foods logged before this update have no data.`

### 7. Change `src/pages/Today.tsx`
Inside the totals card, right after the `space-y-3` div of macro bars, render `<MoreNutrients logs={logs.data ?? []} />` when `logs.data` has at least one entry. Change nothing else.

### Rules
- **Files:**
  - create only `src/food/extras.ts`, `src/food/extras.test.ts` and `src/today/MoreNutrients.tsx`
  - change only the files named in steps 2–7, and add only the new tests named there
- **Don't:** run git commands, create `.env` files, or add packages.
- **Writing:** write each new file in one write, then fix with small `edit`s. Keep JSX ternaries shallow; move a big block into a small component in the same file instead of nesting another `? :`.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 8 + 3 new ones. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed, starting from the line after `✓ built in`.
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI.
- **Wall time:** about **10 min**, 55 steps.
- **Outcome:** finished on the first build.
  - **The one allowed test edit:** it changed `rows.test.ts` exactly as allowed, and nothing else.
  - **Pasted build lines:** not exact. It typed `precircie` for `precache`, so it retyped them rather than copying.

## Result
- **Builds:** yes. **Tests:** 213 passing (202 + 11).
- **Click-through** at 375 px against the mock:
  - "More nutrients ▾" opens and stays open after a reload (`calbud:more-nutrients`)
  - with oatmeal (extras) and yogurt (none) logged, Sodium reads `117.6 mg · 5% (1 without data)`, Fiber `4.1 g · 15%`, Iron `2.2 mg · 12%`, and the others `—`
  - **Logging from Recents:** oatmeal (240 g) saves `extra` scaled from the food's `extra_100g`.
  - **Logging from a live USDA search:** "Banana, raw" (126 g) saves 9 extras, e.g. potassium 410.8 mg, fiber 2.1 g and sugar 19.9 g. The food row gets `extra_100g`.

## What I changed
- **The dash:** `MoreNutrients` had `—` in JSX **text**, which renders as the six characters `—`, not a dash. It's now a real `—`.
- **The note:** "(N without data)" is now small and grey, as the brief said.

## Verdict
Usable after a one-character fix. The biggest data change so far (11 nutrients through 2 sources, rows, logs, copy and edit) landed cleanly because the brief named every key, unit and expected number.

**Deploy note:** `foodRow` now always sends `extra_100g`. If this is pushed before `20261029000002_extras.sql` is applied, **every log fails**. Apply the migration first.
