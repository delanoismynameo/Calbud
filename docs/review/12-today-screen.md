# 12: Today screen (logged meals, totals against goals, edit and delete)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app with Supabase and TanStack Query. Users can already log food (`/add`), which inserts rows into `meal_logs`. Your job is the **Today** screen: list today's logged food grouped by meal, show totals against the user's goals, and let the user change or delete an entry.

### Read only these files
- This file.
- `src/pages/Today.tsx` (the current screen: a title and an `Add food` link).
- `src/food/ServingPicker.tsx` (for the style of toggles, inputs and buttons, and how it uses `useMutation`).
- `src/household/useProfile.ts`, `src/auth/AuthProvider.tsx`, `src/lib/supabase.ts`, `src/lib/queryClient.ts`, `src/lib/dates.ts`, `src/lib/types.ts`.
- `supabase/migrations/20261027000001_tables.sql`: only the `meal_logs` table.

### What the database does (already in place)
- **`meal_logs` columns:** `id`, `user_id`, `logged_on` (a `date`, `YYYY-MM-DD`), `meal_type` (`breakfast` | `lunch` | `dinner` | `snack`), `food_id`, `name`, `quantity_g`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `created_at`.
- **Reading:** row-level security returns your own rows **and your partner's**. So every query **must** filter on `user_id`, or the partner's food will be counted as yours.
- **Updating and deleting:** only your own rows. When a row isn't yours, Supabase returns **no error and changes 0 rows**. So update and delete must ask for the changed rows back and treat 0 rows as an error.
- **Goals** are on the profile: `goal_calories`, `goal_protein_g`, `goal_carbs_g`, `goal_fat_g`, from `useProfile().profile`.

### Create these files
Keep each under about 120 lines, and write **one file per write**.

**1. `src/today/types.ts`**
- `export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'`
- `export const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']`
- `export interface MealLog` with the 12 columns above. `meal_type` is `MealType`; the number columns are `number`; `food_id` is `string | null`.

**2. `src/today/totals.ts`** (plus `src/today/totals.test.ts`). Pure functions, no Supabase.
- **`sumLogs(logs: MealLog[])`** returns `{ kcal, protein_g, carbs_g, fat_g }`. `kcal` is rounded to a whole number; the other three to 1 decimal (`Math.round(x * 10) / 10`). An empty list gives all zeros.
- **`groupByMeal(logs: MealLog[])`** returns `{ meal: MealType; logs: MealLog[] }[]` with **all four meals, always, in `MEALS` order**, including empty ones. Inside each meal, keep the input order.
- **`rescaleLog(log: MealLog, grams: number)`** returns `{ quantity_g, kcal, protein_g, carbs_g, fat_g }` for a new amount of the same food: each number is `old * grams / log.quantity_g`, rounded the same way as `sumLogs`. `quantity_g` is `grams`. It throws a `RangeError` when `grams` isn't a finite number above 0.
- **`progress(value: number, goal: number)`** returns a number from 0 to 100 for a bar's width: `Math.min(100, value / goal * 100)`, and **0 when `goal` is 0 or less** (never `NaN` or `Infinity`).
- **Tests** (vitest, build the logs with a small `log({...})` helper that fills defaults):
  - `sumLogs` of 2 logs (215 kcal / 18.9 g protein and 105 kcal / 1.3 g protein) gives 320 kcal and 20.2 g protein; and `sumLogs([])` gives zeros.
  - Adding `0.1 + 0.2` worth of fat gives `0.3`, not `0.30000000000000004`.
  - `groupByMeal` of one lunch log gives 4 groups, in order, with only lunch non-empty.
  - `rescaleLog` of 150 g / 215 kcal / 18.9 g protein to 300 g gives 430 kcal and 37.8 g protein; and `rescaleLog(log, 0)` throws.
  - `progress(50, 200)` is 25, `progress(300, 200)` is 100, `progress(10, 0)` is 0.

**3. `src/lib/useLocalDate.ts`**
`useLocalDate(): string` returns `localDateString()`, and **keeps it current** when the app stays open past midnight: re-check every 60 seconds with `setInterval` and on the document's `visibilitychange` event, and only call `setState` when the string changed. Clean up both on unmount.

**4. `src/today/mealLogApi.ts`**
- **`fetchMealLogs(userId: string, date: string): Promise<MealLog[]>`:** `select('*')` from `meal_logs` with `.eq('user_id', userId).eq('logged_on', date).order('created_at', { ascending: true })`.
- **`updateMealLog(id: string, changes: Partial<Pick<MealLog, 'meal_type' | 'quantity_g' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>>): Promise<void>`:** `.update(changes).eq('id', id).select('id')`. Throw `new Error('That entry could not be changed.')` when the returned array is empty.
- **`deleteMealLog(id: string): Promise<void>`:** `.delete().eq('id', id).select('id')`. Throw `new Error('That entry could not be deleted.')` when the returned array is empty.
- On any Supabase error, throw `new Error(error.message)`.

**5. `src/today/useMealLogs.ts`**
`useMealLogs(date: string)` uses `useQuery`:
- `userId` is `useAuth().session?.user.id`.
- `queryKey: ['meal-logs', userId, date]`, `enabled: !!userId`, `queryFn: () => fetchMealLogs(userId!, date)`.
- Returns the query result as is.

**6. `src/today/MacroBar.tsx`**
Props: `label: string`, `value: number`, `goal: number`, `unit: string` (`'g'`).
- One line of text: label on the left, `<value> / <goal> <unit>` on the right.
- Under it, a bar: a `bg-slate-700` track `h-2 rounded-full`, filled to `progress(value, goal)`% in `bg-blue-500`, or `bg-amber-500` when `value > goal`.
- Give the track `role="progressbar"`, `aria-label={label}`, `aria-valuenow={value}`, `aria-valuemin={0}` and `aria-valuemax={goal}`.

**7. `src/today/EditMealLog.tsx`**
Props: `log: MealLog` and `onClose: () => void`. A panel shown in place of the entry's row while editing.
- **Grams:** a labelled text input (`inputMode="decimal"`), starting at the log's `quantity_g`. **Valid** means a finite number above 0 and at most 5000. When invalid, show `Enter an amount between 0 and 5000 g.` and disable Save.
- **Live calories:** while valid, show `<kcal> kcal` from `rescaleLog(log, grams)`.
- **Meal:** four toggle buttons like `ServingPicker`'s, each with `aria-pressed`, starting at `log.meal_type`.
- **Save** (`useMutation`): calls `updateMealLog(log.id, { meal_type, ...rescaleLog(log, grams) })`. While pending, the button says `Saving…` and is disabled. **On success:** `await queryClient.invalidateQueries({ queryKey: ['meal-logs'] })`, then `onClose()`. **On error:** show the message in red, keep the panel open and keep the values.
- **Delete** (a second `useMutation`): the first tap only changes the button's text to `Tap again to delete`; the second tap calls `deleteMealLog(log.id)`. Pending text `Deleting…`. Success and error behave like Save.
- **Cancel:** calls `onClose()` without saving.
- Disable all three buttons while either mutation is pending. Every button is `type="button"` **and has an `onClick`**.

**8. `src/today/MealSection.tsx`**
Props: `meal: MealType` and `logs: MealLog[]`.
- **Header:** the meal name capitalised (`Breakfast`), and on the right the section's `sumLogs(logs).kcal` followed by ` kcal`.
- **Empty:** `Nothing logged.` in grey.
- **Each entry** is a full-width `type="button"` row showing the `name` (truncated with `truncate` if long), `<quantity_g> g` in grey, and `<kcal> kcal` on the right. Tapping it shows `<EditMealLog log={…} onClose={…} />` in place of that row. Keep the id of the entry being edited in state (**the id, not its position in the list**), and only one entry can be open at a time within the section.

### Change this file
**`src/pages/Today.tsx`**, rewritten. Keep `export default function Today()` and the `Add food` `<Link to="/add">` (it must stay a `Link`, never an `<a href>`, because the app uses HashRouter).
- `const date = useLocalDate()`, `const logs = useMealLogs(date)`, `const { profile } = useProfile()`.
- **Top card:**
  - Calories: `<total kcal> / <goal_calories> kcal`, large, and under it `<n> kcal left` or, when over, `<n> kcal over` in amber.
  - Three `MacroBar`s: Protein, Carbs, Fat, against `goal_protein_g`, `goal_carbs_g`, `goal_fat_g`.
- **Then** the `Add food` link, then one `MealSection` per group from `groupByMeal`.
- **Loading:** while `logs.isPending`, show `Loading…` instead of the card and sections.
- **Error:** when `logs.isError`, show `Couldn't load today's food.` in red, the error message in small grey text, and a `Try again` button that calls `logs.refetch()`. The `Add food` link stays visible.
- When `profile` is null, still render (use goals of 0, which `progress` turns into empty bars).

### Style
Match `ServingPicker.tsx`: `bg-slate-800` cards with `rounded-lg p-4`, labels in `text-gray-400`, buttons and inputs at least 44px tall (`py-3`), a blue primary button, and errors in `text-red-400`. Left-aligned text (the current `text-center` wrapper goes). It must work at phone width (375px) with no sideways scrolling.

### Rules
- TypeScript only, with no `any`. **No new dependencies.**
- **Never call Supabase from tests.** The tests here are pure-function tests only.
- Write one file per write. Don't change files not listed here. Don't run git commands. Don't create `.env` files.

### Done when
1. `npm test` passes, including the new `totals` tests.
2. `npm run build` passes with no TypeScript errors.
3. `npm run test:db` still prints `31 passed, 0 failed`.
4. You have read every new `.tsx` file once more and checked that **every `<button>` has an `onClick`**, and that `Today.tsx` has no `<a href`.
5. You have re-read this brief section by section.

Reply with: the files created and changed, the test count, the build result, and anything you were unsure about. **Report only what you actually did and saw.** Don't describe the brief from memory.
