# 27: Extra nutrients on your own foods and dishes

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app. Foods from USDA and Open Food Facts now carry **extra nutrients** (`extras100g`): sodium, fiber, iron and the rest of the US Nutrition Facts label. Foods the household types in itself don't have them yet:
- **custom foods**, made with `CustomFoodForm` on Add food
- **prep dishes**, made in the "Nutrition per serving" part of `PrepForm`

Your job: let people type these per serving (all optional), and save them per 100 g.

### Already done (don't redo)
- **`src/food/extras.ts`:** `EXTRAS` (11 entries with `key`, `label`, `unit`, …), `type ExtraKey`, `type Extras`, and `cleanExtras(raw)`.
- **Where extras end up:**
  - `FoodResult.extras100g?: Extras`
  - `foodRow()` saves it as `extra_100g`
  - logging scales it into the log
- **The prep form:** `PrepForm` builds the dish's food with `parseDish(...)` from `src/prep/dishFood.ts`, then `saveDishFood(food, householdId)`.

### Read only these files
- This file.
- `src/food/extras.ts` and the first 30 lines of `src/food/extras.test.ts`.
- `src/food/CustomFoodForm.tsx` and `src/prep/PrepForm.tsx`: the files you change.
- `src/prep/dishFood.ts` and `src/food/recents.ts`, for `FoodRowFromDb`.

### Write in this order. Run `npm test` after step 1 before you continue.

### 1. Add to `src/food/extras.ts`, with tests in `src/food/extras.test.ts`
```ts
export type ExtraInputs = Partial<Record<ExtraKey, string>>   // per serving, as typed
export function parseExtraInputs(inputs: ExtraInputs, servingG: number):
  | { ok: true; extras100g: Extras }
  | { ok: false; errors: Partial<Record<ExtraKey, string>> }
export function extrasPerServing(extras100g: Extras, servingG: number): ExtraInputs
```
- **`parseExtraInputs`:** for each `EXTRAS` entry, read `inputs[key]`:
  - missing, or blank after trimming: skip it
  - otherwise replace one `,` with `.` and run `Number()` on it
  - if the result isn't finite, or is `< 0` or `> 100000`, the error for that key is `Enter a number (or leave it blank).`
  - otherwise store `Math.round(v / servingG * 100 * 100) / 100`, the per-100 g amount
  - if there are any errors, return `{ ok: false, errors }`, otherwise `{ ok: true, extras100g }`
- **`extrasPerServing`:** for each key present in `extras100g`, the value is `String(Math.round(v * servingG / 100 * 10) / 10)`.

New tests, one `it` each, added at the end of `extras.test.ts`. Don't change the existing tests.
1. `parseExtraInputs({ sodium_mg: '700', fiber_g: ' 3.5 ', iron_mg: '' }, 350)` equals `{ ok: true, extras100g: { sodium_mg: 200, fiber_g: 1 } }`.
2. `parseExtraInputs({ sodium_mg: 'abc', sat_fat_g: '-1' }, 100)` equals `{ ok: false, errors: { sodium_mg: 'Enter a number (or leave it blank).', sat_fat_g: 'Enter a number (or leave it blank).' } }`.
3. `parseExtraInputs({ calcium_mg: '1,5' }, 100)` equals `{ ok: true, extras100g: { calcium_mg: 1.5 } }`, and `parseExtraInputs({}, 100)` equals `{ ok: true, extras100g: {} }`.
4. `extrasPerServing({ sodium_mg: 200, fiber_g: 1 }, 350)` equals `{ sodium_mg: '700', fiber_g: '3.5' }`, and `extrasPerServing({}, 100)` equals `{}`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 2. `src/food/ExtrasFields.tsx` (new)
`export default function ExtrasFields({ values, errors, onChange }: { values: ExtraInputs; errors: Partial<Record<ExtraKey, string>>; onChange: (key: ExtraKey, value: string) => void })`
- **The `open` state:** it starts as `true` if any value in `values` isn't blank, otherwise `false`.
- **The toggle:** a left-aligned button, `text-sm text-blue-400`, reading `` `More nutrients (optional) ${open ? '▴' : '▾'}` `` with `aria-expanded={open}`. Its `type="button"`, so it never submits a form.
- **When open:** a `grid grid-cols-2 gap-2` with one field per `EXTRAS` entry:
  - a `<label htmlFor={'extra-' + key}>` with `` `${label} (${unit})` ``, in `block text-gray-400 text-sm mb-1`
  - an `<input id={'extra-' + key} type="text" inputMode="decimal">` with `value={values[key] ?? ''}` that calls `onChange(key, e.target.value)`. It uses the class `w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500`.
  - the error under it in `text-red-400 text-xs`
- **Under the grid,** a grey `text-xs` line: `Per serving, from the label. Leave blank what you don't know.`
- **Also when closed:** if any `errors` exist, show `Check the nutrients below.` in red next to the toggle, and open the section. Use a `useEffect` on `errors` that calls `setOpen(true)` when it has any key.

### 3. Change `src/food/CustomFoodForm.tsx`
- **New state:**
  - `extraInputs: ExtraInputs`, starting as `{}`
  - `extraErrors: Partial<Record<ExtraKey, string>>`, starting as `{}`
- **Changing a field:** `onChange` sets that key and clears that key's error.
- **Where the section goes:** render `<ExtrasFields values={extraInputs} errors={extraErrors} onChange={…} />` right after the hint `Per serving. An estimate is fine.`
- **In `handleSubmit`:**
  1. `const result = parseCustomFood(input, crypto.randomUUID())`.
  2. `const extras = result.ok ? parseExtraInputs(extraInputs, result.food.servingG!) : null`.
  3. Set `errors` (from `result` when it isn't ok, otherwise `{}`), and set `extraErrors` (from `extras` when it isn't ok, otherwise `{}`).
  4. **Stop** if `result` isn't ok or `extras` isn't ok.
  5. Otherwise use `food = { ...result.food, extras100g: extras.extras100g }` for both the insert and `onSaved(food)`.
- Keep the household check and the insert exactly as they are, just with `food`.

### 4. Change `src/prep/PrepForm.tsx`
- **New state:**
  - `dishExtras: ExtraInputs`, starting as `prep?.foods?.serving_g != null ? extrasPerServing(cleanExtras(prep.foods.extra_100g), Number(prep.foods.serving_g)) : {}`
  - `dishExtraErrors`, starting as `{}`
- **Picking a saved dish** in the "Same as a saved dish" select also sets `dishExtras` from that food in the same way, and clears `dishExtraErrors`.
- **Where the section goes:** inside the "Nutrition per serving (optional)" section, render `<ExtrasFields values={dishExtras} errors={dishExtraErrors} onChange={…} />` right after the 5-field grid and before the grey hint.
- **In `save`**, after the dish is parsed:
  - if `dishFood` isn't null, run `parseExtraInputs(dishExtras, dishFood.servingG!)`
  - if that isn't ok, set `dishExtraErrors` and stop, just like the other errors
  - if it is ok, set `dishFood = { ...dishFood, extras100g: parsed.extras100g }` and clear `dishExtraErrors`
  - if the dish is blank, ignore `dishExtras`: the extras need a serving weight
- Change nothing else.

### Rules
- **Files:**
  - create only `src/food/ExtrasFields.tsx`
  - change only `src/food/extras.ts`, `src/food/extras.test.ts` (add tests only), `src/food/CustomFoodForm.tsx` and `src/prep/PrepForm.tsx`
- **Don't:** run git commands, create `.env` files, or add packages.
- **Writing:** write each new file in one write, then fix with small `edit`s. Keep JSX ternaries shallow.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 4. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Copy the last 5 lines it prints** from the terminal output; don't retype them.
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.
