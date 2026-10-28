# 23: Prep dishes as custom foods, and "Log a serving"

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. The **Prep** page plans shared meal-prep sessions (`meal_prep` rows). Your job: let a session carry **nutrition per serving**. It is saved as one of the household's **custom foods** (a `foods` row with `source: 'custom'`), and the session links to it through the new column `meal_prep.food_id`. Then a **Log** button on the Prep page logs a serving to the user's day. Leftovers later show up in Add food's Recent list like any other food.

### Already done (don't redo)
- **The database column:** `meal_prep.food_id uuid null`, which references `foods(id)` (`on delete set null`).
- **Custom foods:** `parseCustomFood` in `src/food/customFood.ts` validates per-serving numbers and turns them into a `FoodResult`, stored per 100 g.
- **Food rows:** `foodRow()` in `src/food/rows.ts` builds a `foods` row, and `foodResultFromRow()` / `FoodRowFromDb` in `src/food/recents.ts` turn one back.
- **Logging:** `ServingPicker` in `src/food/ServingPicker.tsx` lets the user pick servings and a meal, then logs. It takes `{ food, onLogged, onCancel }`.

### Read only these files
- This file.
- `src/prep/types.ts`, `src/prep/prepApi.ts`, `src/prep/PrepForm.tsx`, `src/pages/Prep.tsx`: the files you change.
- `src/food/customFood.ts`, `src/food/rows.ts`, `src/food/recents.ts`, `src/food/logFood.ts`: the helpers listed above.
- `src/food/useFavoriteFoods.ts`: an example of a query hook.
- The first 30 lines of `src/food/customFood.test.ts`, for the test style.

### Write in this order. Run `npm test` after step 2 before you continue.

### 1. `src/prep/types.ts`
Add to `MealPrep`: `food_id: string | null` and `foods: FoodRowFromDb | null`. The second is the embedded food, filled by the query in step 3. Import the type from `../food/recents`. Leave `PrepFields` as it is.

### 2. `src/prep/dishFood.ts` and `src/prep/dishFood.test.ts`
```ts
export interface DishInput { servingG: string; kcal: string; protein: string; carbs: string; fat: string }
export const emptyDish: DishInput   // all ''
export function isDishBlank(d: DishInput): boolean
export function dishFromFood(row: FoodRowFromDb): DishInput
export function kcalPerServing(row: FoodRowFromDb): number | null
export function parseDish(title: string, d: DishInput, sourceId: string):
  | { ok: true; food: FoodResult }
  | { ok: false; errors: Partial<Record<keyof DishInput, string>> }
```
- **`isDishBlank`:** true when every field is empty after trimming.
- **`dishFromFood`:**
  - if `serving_g` is null, return `emptyDish`
  - otherwise, with `g = Number(serving_g)`:
    - `servingG` is `String(g)`
    - `kcal` is `String(Math.round(Number(kcal_100g) * g / 100))`
    - `protein`, `carbs` and `fat` are each `String(Math.round(Number(x_100g) * g / 100 * 10) / 10)`
- **`kcalPerServing`:** `null` when `serving_g` is null, otherwise `Math.round(Number(kcal_100g) * Number(serving_g) / 100)`.
- **`parseDish`:** call `parseCustomFood({ name: title, servingLabel: '1 serving', servingG: d.servingG, kcal: d.kcal, protein: d.protein, carbs: d.carbs, fat: d.fat }, sourceId)`.
  - If it is ok, return `{ ok: true, food }`.
  - Otherwise return only the errors for `servingG`, `kcal`, `protein`, `carbs` and `fat`, with the same messages, and drop any `name` error, because the title is checked by the prep form. If the only error was `name`, return `{ ok: false, errors: {} }`.

Tests, one `it` each. The food row helper `row(o)` builds a `FoodRowFromDb` with `serving_g: 350`, `kcal_100g: 148.57`, `protein_100g: 8.57`, `carbs_100g: 15.71`, `fat_100g: 5.71` and any values you like for the rest:
1. `isDishBlank(emptyDish)` is true, `isDishBlank({ ...emptyDish, kcal: '  ' })` is true, and `isDishBlank({ ...emptyDish, kcal: '5' })` is false.
2. `dishFromFood(row())` is `{ servingG: '350', kcal: '520', protein: '30', carbs: '55', fat: '20' }`.
3. `dishFromFood(row({ serving_g: null }))` is `emptyDish`.
4. `kcalPerServing(row())` is `520`, and with `serving_g: null` it is `null`.
5. `parseDish('Curry', { servingG: '350', kcal: '520', protein: '30', carbs: '55', fat: '20' }, 'dish-1')` is ok, with `food.name` `'Curry'`, `food.source` `'custom'`, `food.sourceId` `'dish-1'`, `food.servingG` `350`, `food.servingLabel` `'1 serving'` and `food.kcal100g` `148.57`.
6. A blank `servingG` gives an error on `servingG` only.
7. `parseDish('', { …valid })` gives `{ ok: false, errors: {} }`.
8. `kcal: 'abc'` gives an error on `kcal`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 3. `src/prep/prepApi.ts`
- `fetchPrepWeek`: select `'*, foods(*)'` instead of `'*'`.
- `insertPrep(householdId, userId, fields, foodId: string | null)`: also insert `food_id: foodId`.
- `updatePrep`: its `changes` type also allows `food_id?: string | null`.
- Add:
  ```ts
  export async function saveDishFood(food: FoodResult, householdId: string): Promise<string>
  ```
  It upserts `foodRow(food, householdId)` into `foods` with `{ onConflict: 'household_id,source,source_id' }`, then `.select('id').single()`, exactly like step 1 of `logFood.ts`. It throws on error and returns the id.

### 4. `src/prep/useDishFoods.ts`
`export function useDishFoods()`, like `useFavoriteFoods`:
- `queryKey: ['custom-foods', householdId]`
- query: `foods` with `.eq('household_id', householdId).eq('source', 'custom').order('name')`
- returns the rows as `FoodRowFromDb[]`, not converted

### 5. Change `src/prep/PrepForm.tsx`
- **New state:**
  - `dish`: initially `prep?.foods ? dishFromFood(prep.foods) : emptyDish`
  - `dishSourceId`: initially `prep?.foods?.source_id ?? null`
  - `dishErrors`
- **Field changes:** changing a dish field clears that field's error. Changing the **title** does not touch the dish.
- **A new section after Minutes/Servings,** before Recipe link:
  - a heading `Nutrition per serving (optional)`
  - **if `useDishFoods()` returns any foods,** a `<select>` labelled `Same as a saved dish`:
    - the first option is `—` with value `''`, then one option per food: its name, with its id as the value
    - choosing a food sets `dish = dishFromFood(food)` and `dishSourceId = food.source_id`, and sets the title to `food.name` if the title is empty
    - choosing `—` does nothing
  - **then a 2-column grid of text inputs** (`inputMode="decimal"`), each with its error under it and a `<label htmlFor>`:
    - `Serving weight (g)`
    - `Calories`
    - `Protein (g)`
    - `Carbs (g)`
    - `Fat (g)`
  - **a grey hint:** `Weigh one portion or estimate it (a bowl of curry is about 350 g). It's saved as a custom food named after this session, so leftovers show up in Add food.`
- **Saving.** In `save`:
  1. Run `parsePrepForm(input)`.
  2. If the dish is not blank, also run `parseDish(input.title.trim(), dish, dishSourceId ?? crypto.randomUUID())`.
  3. Set both error sets. **If either failed, stop.**
  4. Otherwise call the mutation with `{ fields, dishFood }`, where `dishFood` is the parsed food, or `null` when the dish is blank.
- **The mutation:**
  - `foodId = dishFood ? await saveDishFood(dishFood, householdId) : null`. `householdId` is `profile.household_id`; if it is missing, throw `Join or create a household first.`
  - then `updatePrep(prep.id, { ...fields, food_id: foodId })` in edit mode, or `insertPrep(householdId, profile.id, fields, foodId)`
  - **on success,** invalidate `['meal-prep']`, `['custom-foods']`, `['recent-foods']` and `['favorite-foods']`, then `onClose()`
- **Behaviour to keep:**
  - editing a session with a linked food and saving keeps the **same** food (same `source_id`), so the upsert updates it
  - clearing every dish field and saving sets `food_id: null`; the food itself stays

### 6. Change `src/pages/Prep.tsx`
- **New state:** `logging: MealPrep | null`. Next to the existing `if (editing)` early return, add `if (logging?.foods) return <ServingPicker food={foodResultFromRow(logging.foods)} onLogged={() => setLogging(null)} onCancel={() => setLogging(null)} />`. Every hook must stay above both early returns.
- **The details line:** when `session.foods` is set and `kcalPerServing(session.foods)` isn't null, add `${kcal} kcal each` after the servings part, in the same ` · ` list.
- **A Log button:** for each session with `session.foods`, add a small button **between** the main button and the status button:
  - its text is `Log`, with `aria-label={'Log a serving of ' + session.title}`
  - it uses the status button's size, styled `bg-blue-600 text-white`
  - it sets `logging = session`

### Rules
- Create only the files listed, and change only the files named in steps 1, 3, 5 and 6. Don't run git commands. Don't create `.env` files. Don't add packages. Don't create any other files.
- Write each new file in one write, then fix with small `edit`s.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm test` passes: the 177 existing tests plus your 8. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed, starting from the line after `✓ built in`.
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.
