# 25: Past days on Today, logging to them, and "Copy yesterday"

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query, Supabase and `react-router` (a HashRouter). The **Today** screen (`src/pages/Today.tsx`) shows the signed-in user's food for the current date only. Your job:
1. **‹ and › arrows** on Today to step through earlier days. The day is in the URL, as `#/?date=YYYY-MM-DD`.
2. **Add food logs to the day being viewed**, not always to today.
3. **A "Copy" button** that copies the previous day's food into an empty day.

### Already done (don't redo)
- **A day's food:** `useMealLogs(date)` loads the user's `meal_logs` for any date (query key `['meal-logs', userId, date]`).
- **Date helpers:**
  - `addDays(date, n)` and `dayLabel(date)` (e.g. `'Mon Oct 26'`) are in `src/prep/week.ts`
  - `localDateString()` is in `src/lib/dates.ts`
  - `useLocalDate()` in `src/lib/useLocalDate.ts` is today's local date, and updates at midnight
- **Logging:** `ServingPicker` logs with `loggedOn: localDateString()`.

### Read only these files
- This file.
- `src/pages/Today.tsx`, `src/pages/AddFood.tsx`, `src/food/ServingPicker.tsx`, `src/today/mealLogApi.ts`: the files you change.
- `src/today/types.ts`, `src/today/useMealLogs.ts`, `src/prep/week.ts`, `src/lib/dates.ts`, `src/lib/useLocalDate.ts`.
- The first 25 lines of `src/today/totals.test.ts`, for the test style and its `log()` helper.

### Write in this order. Run `npm test` after step 1 before you continue.

### 1. `src/today/day.ts` and `src/today/day.test.ts`
```ts
import type { MealLog } from './types'
export type MealLogInsert = Omit<MealLog, 'id' | 'created_at'>
export function dayTitle(date: string, today: string): string
export function validDayParam(param: string | null, today: string): string | null
export function copyRows(logs: MealLog[], toDate: string): MealLogInsert[]
```
- **`dayTitle`:**
  - `'Today'` when `date === today`
  - `'Yesterday'` when `date === addDays(today, -1)`
  - otherwise `dayLabel(date)`
- **`validDayParam`:** returns `param` only when all of these hold, otherwise `null`:
  - it isn't null
  - it matches `/^\d{4}-\d{2}-\d{2}$/`
  - it's a real date: `addDays(param, 0) === param`, so `'2026-02-30'` fails
  - it isn't in the future: `param <= today` (a string comparison works for this format)
- **`copyRows`:** one row per log, in order, with these fields only:
  - `user_id`, `meal_type`, `food_id`, `name`, `quantity_g`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, copied from the log
  - `logged_on: toDate`
  - no `id` and no `created_at`

Tests, one `it` each. Copy the `log()` helper from `totals.test.ts`.
1. `dayTitle('2026-10-28', '2026-10-28')` is `'Today'`, `dayTitle('2026-10-27', '2026-10-28')` is `'Yesterday'`, and `dayTitle('2026-10-26', '2026-10-28')` is `'Mon Oct 26'`.
2. `dayTitle('2026-10-31', '2026-11-01')` is `'Yesterday'`.
3. `validDayParam('2026-10-26', '2026-10-28')` is `'2026-10-26'`, and `validDayParam('2026-10-28', '2026-10-28')` is `'2026-10-28'`.
4. `validDayParam` gives `null` for each of these, with today `'2026-10-28'`:
   - `null`
   - `'2026-10-29'` (the future)
   - `'abc'`
   - `'2026-02-30'`
   - `'2026-1-5'`
5. `copyRows([log({ id: 'a', meal_type: 'breakfast', name: 'Oats', food_id: 'f1' }), log({ id: 'b' })], '2026-10-28')` equals:
   ```ts
   [
     { user_id: 'u1', logged_on: '2026-10-28', meal_type: 'breakfast', food_id: 'f1', name: 'Oats', quantity_g: 200, kcal: 500, protein_g: 20, carbs_g: 60, fat_g: 10 },
     { user_id: 'u1', logged_on: '2026-10-28', meal_type: 'lunch', food_id: null, name: 'food', quantity_g: 200, kcal: 500, protein_g: 20, carbs_g: 60, fat_g: 10 },
   ]
   ```
   Use `toEqual`.
6. `copyRows([], '2026-10-28')` is `[]`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 2. `src/today/mealLogApi.ts`: add
```ts
export async function insertMealLogs(rows: MealLogInsert[]): Promise<void>
```
- if `rows` is empty, return without calling Supabase
- otherwise `supabase.from('meal_logs').insert(rows)`, and throw `new Error(error.message)` on error

### 3. Change `src/food/ServingPicker.tsx`
- Add an optional prop `loggedOn?: string`. The log uses `loggedOn: loggedOn ?? localDateString()`, and keep the comment about reading it when Log is pressed.
- **When `loggedOn` is set and isn't `localDateString()`,** show a small grey line under the food name: `` `Logging to ${dayLabel(loggedOn)}` ``.
- Change nothing else.

### 4. Change `src/pages/AddFood.tsx`
- **The day from the URL:**
  - `const [params] = useSearchParams()` (from `react-router`)
  - `const today = useLocalDate()`
  - `const day = validDayParam(params.get('date'), today)`
  - `day` is `null` for today or a bad value
- **`home`:** `day ? `/?date=${day}` : '/'`. Use it for the Back link's `to`, and in `onLogged={() => navigate(home)}`.
- **Logging:** pass `loggedOn={day ?? undefined}` to `ServingPicker`.
- **The heading:** when `day` is set and isn't `today`, add a small grey `` ` · ${dayTitle(day, today)}` `` after `Add food`.

### 5. Change `src/pages/Today.tsx`
- **The day:**
  - `const today = useLocalDate()`
  - `const [params, setParams] = useSearchParams()`
  - `const date = validDayParam(params.get('date'), today) ?? today`
  - `const isToday = date === today`
  - **every hook stays above the `if (logging)` early return**
- **Moving between days:**
  - `goTo(d)` is `setParams(d === today ? {} : { date: d })`
  - so today's URL stays plain `#/`
- **A day header,** as the first child of the page (above the error and the totals), in a `flex items-center justify-between` row:
  - **a `‹` button:** `aria-label="Previous day"`, calls `goTo(addDays(date, -1))`
  - **the title:** an `h1` with `dayTitle(date, today)`, `text-lg font-semibold`
  - **a `›` button:** `aria-label="Next day"`, calls `goTo(addDays(date, 1))`, and is `disabled` (with `disabled:opacity-30`) when `isToday`
  - **both buttons** use the Prep page's week-arrow style (`w-9 h-9 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700`)
  - **when not `isToday`:** under the row, a small `Back to today` button (`text-sm text-blue-400 underline`) that calls `goTo(today)`
- **The error text:** `Couldn't load today's food.` becomes `` `Couldn't load ${isToday ? "today's" : 'this day’s'} food.` ``.
- **Both `Add food` links:** `to={isToday ? '/add' : `/add?date=${date}`}`.
- **`TodayMenu`:** render it only when `isToday`.
- **Copy from the previous day:**
  - `const prev = addDays(date, -1)` and `const prevLogs = useMealLogs(prev)`
  - a mutation that calls `insertMealLogs(copyRows(prevLogs.data ?? [], date))`, then invalidates `['meal-logs']`
  - **show a button only when** `logs.data` has loaded and is empty and `prevLogs.data` has at least one entry. It goes right after the `Add food` link in the normal branch.
    - its text is `` `Copy ${dayTitle(prev, today).toLowerCase() === 'yesterday' ? 'yesterday' : dayLabel(prev)}'s food (${n} item${n === 1 ? '' : 's'})` ``, where `n = prevLogs.data.length`
    - styled like the dashed buttons on Add food: `w-full py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800`
    - disabled while pending, showing `Copying…`
    - a failed copy shows `error.message` in red under it

### Rules
- **Files:**
  - create only `src/today/day.ts` and `src/today/day.test.ts`
  - change only `src/today/mealLogApi.ts`, `src/food/ServingPicker.tsx`, `src/pages/AddFood.tsx` and `src/pages/Today.tsx`
  - don't create any other files
- **Don't:** run git commands, create `.env` files, or add packages.
- **Writing:** write each new file in one write, then fix with small `edit`s. Keep JSX ternaries shallow; if a block gets hard to read, move it into a small component in the same file instead of nesting another `? :`.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 6. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed, starting from the line after `✓ built in`.
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.
