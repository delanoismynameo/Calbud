# 74: Tap a row on the Nutrition Facts label to correct it

Read `docs/review/features-common.md` first and follow it, with these exceptions: ignore its line about the `redesign` branch (stay on the checked-out branch), do not commit, and you MAY run `npx tsc -b` and `npm test`: you must run both before you reply. Do not read `docs/review/model-bench.md`, do not read photos, do not write scratch scripts, do not fetch anything from the web. Everything you need is in this file.

## What and why
On the screen where you pick a serving (`ServingPicker`), the Nutrition Facts label is read-only. Open Food Facts is sometimes wrong (for example a glass of milk shows 336 kcal when the carton says 140). Let the user tap a row on the label, type the right number, and have the screen and the logged entry use it. The correction applies to this log only for now: saving it for a barcode is a later task. The serving control (the Servings/Grams toggle and the amount box) is NOT changed and stays where it is.

## Files
`src/food/labelEdit.ts` (new), `src/food/labelEdit.test.ts` (new), `src/food/NutritionLabel.tsx`, `src/food/ServingPicker.tsx`

## Steps

1. **`src/food/labelEdit.ts` (new).** Imports: `import type { FoodResult } from './types'`, `import type { ExtraKey } from './extras'`, `import { EXTRAS } from './extras'`. Export:
   - `export type EditKey = 'kcal' | 'fat' | 'carbs' | 'protein' | ExtraKey`
   - `export function editUnit(key: EditKey): string` returns `'kcal'` for `'kcal'`, `'g'` for `'fat' | 'carbs' | 'protein'`, and for an extra key the `unit` of the matching entry in `EXTRAS`.
   - `export function applyLabelEdit(food: FoodResult, key: EditKey, value: number, grams: number): FoodResult`. `value` is the amount shown on the label for `grams` of food. Convert it to per 100 g: `Math.round(value / grams * 100 * 100) / 100`. Return a NEW object, never change `food`. If `grams` is not a finite number above 0, or `value` is not a finite number of 0 or more, return `food` itself unchanged. Then set: `'kcal'` → `kcal100g`; `'fat'` → `fat100g`; `'carbs'` → `carbs100g`; `'protein'` → `protein100g`; any extra key → `extras100g: { ...(food.extras100g ?? {}), [key]: per100 }`. Also keep the three older fields in step: key `'fiber_g'` also sets `fiber100g`, `'sugar_g'` also sets `sugar100g`, `'sodium_mg'` also sets `sodiumMg100g`, each to the same per-100 g number.

2. **`src/food/labelEdit.test.ts` (new).** Use `describe/it/expect` from `vitest`. Build a base `FoodResult` (source `'off'`, sourceId `'123'`, name `'Test'`, brand `null`, servingG `31`, servingLabel `'6 pieces'`, kcal100g 419, protein100g 0, carbs100g 80, fat100g 9.7, fiber100g `null`, sugar100g `null`, sodiumMg100g `null`, barcode `'123'`, extras100g `{ sat_fat_g: 4 }`). Tests: (a) `applyLabelEdit(base, 'fat', 3, 31).fat100g` is `9.68`; (b) `'kcal'`, 140, 240 g gives `kcal100g` `58.33`; (c) `'sodium_mg'`, 120, 240 g gives `extras100g.sodium_mg` `50` and `sodiumMg100g` `50`, and `extras100g.sat_fat_g` is still `4`; (d) `'protein'` 13 for 240 g gives `5.42`; (e) grams `0` returns the same object (`toBe(base)`); (f) a negative value returns the same object; (g) the original `base` is not changed after an edit (`base.fat100g` still `9.7`); (h) `editUnit('kcal')` is `'kcal'`, `editUnit('fat')` is `'g'`, `editUnit('sodium_mg')` is `'mg'`.

3. **`src/food/NutritionLabel.tsx`.** Add two OPTIONAL props to the component: `values?: Partial<Record<EditKey, number>>` (the current number for each row, used to fill the edit box) and `onEdit?: (key: EditKey, value: number) => void`. Import `EditKey` and `editUnit` from `./labelEdit` and `useState` from `react`. **When `onEdit` is not given the label must look and behave exactly as it does today** (it is also used by `CustomFoodForm`, `PrepForm` and `MoreNutrients`, which you must not change). When `onEdit` is given:
   - Keep `const [editing, setEditing] = useState<EditKey | null>(null)` in the component.
   - The Calories line (key `'kcal'`) and every row (its `row.key`) become tappable. Wrap the row's existing content in a `<button type="button" onClick={() => setEditing(key)} className="w-full text-left">` and keep the same layout classes.
   - The row being edited shows, in place of its normal content: its label, then `<input type="text" inputMode="decimal" autoFocus defaultValue={...} aria-label={...}>` (default is `String(values?.[key] ?? '')`, aria-label `New value for <label>`; classes `w-20 bg-card border border-line rounded px-2 py-0.5 text-ink focus:outline-none focus:ring-2 focus:ring-coral`), the unit from `editUnit(key)`, a submit button `Save` (`text-link font-semibold`) and a `type="button"` button `Cancel` (`text-muted`). Put these in a `<form>`. On submit: `const n = Number(text.replace(',', '.'))`; if `Number.isFinite(n) && n >= 0` call `onEdit(key, n)` and `setEditing(null)`, otherwise leave the box open. Pressing Escape in the box or tapping Cancel calls `setEditing(null)`. Only one row is edited at a time.
   - Make a small helper component in the same file for the edit box so `RowContent` stays readable. Do not change the `LabelRow` type or `src/food/label.ts`.
   - Directly after the existing footnote line (and the `note` line), when `onEdit` is given, add `<p className="text-xs text-muted mt-1">Tap a row to correct it.</p>`.

4. **`src/food/ServingPicker.tsx`.**
   - Add `const [edited, setEdited] = useState<FoodResult | null>(null)` and `const shown = edited ?? food` near the top of the component (`FoodResult` is already imported as a type).
   - Use `shown` instead of `food` in: `scaleNutrition(food, grams)`, the `food` passed to `logFood`, and `food.extras100g` in the label rows. Leave `food` everywhere else (favourites, `servingG`, `servingLabel`, the name and brand).
   - Pass to `NutritionLabel`: `values={{ kcal: nutrition.kcal, fat: nutrition.fat_g, carbs: nutrition.carbs_g, protein: nutrition.protein_g, ...scaleExtras(shown.extras100g ?? {}, grams) }}` and `onEdit={(key, value) => setEdited(applyLabelEdit(shown, key, value, grams))}`. Import `applyLabelEdit` from `./labelEdit`.
   - Directly above the `NutritionLabel`, when `edited` is not null, show `<p className="text-sm text-muted">Edited for this log. <button type="button" onClick={() => setEdited(null)} className="text-link font-semibold">Undo</button></p>`.
   - Do not touch the serving toggle, the amount box, the meal buttons or the Log/Cancel buttons.

## Done means
- Only those four files changed (two new, two edited).
- `npx tsc -b` and `npm test` both pass (you ran them). If one fails, fix only your own mistakes.
- No `any`, no unused imports, token colours only, no `dark:` variants.
- The label looks identical when `onEdit` is not passed.
- Reply as in `features-common.md`, and include the output of `npx tsc -b` and the test totals.
