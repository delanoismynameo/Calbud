# 21: Meal prep week view and form

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Two partners share a household. Your job: turn the placeholder **Prep** page (`src/pages/Prep.tsx`) into a shared meal-prep planner. It shows one week of **prep sessions**, and lets either partner add, edit, delete and tick off sessions.

### The table (already exists; don't write SQL)
`meal_prep` columns:

| Column | Type and rules |
|---|---|
| `id` | uuid |
| `household_id` | uuid, not null |
| `created_by` | uuid, null |
| `title` | text, not null |
| `recipe_url` | text, null |
| `scheduled_date` | date `'YYYY-MM-DD'`, not null |
| `start_time` | time `'HH:MM:SS'`, null |
| `duration_min` | int, not null, > 0, default 60 |
| `status` | `'planned'` or `'done'` |
| `servings` | int, not null, > 0, default 1 |
| `ingredients` | jsonb array of `{ name, qty, unit }` |
| `notes` | text, null |
| `created_at` | timestamptz |

Row security already lets either household member read and change every row of their household.

### Read only these files
- This file.
- `src/lib/dates.ts` and `src/lib/useLocalDate.ts`: local date helpers.
- `src/household/useProfile.ts`: `profile.id` and `profile.household_id`.
- `src/today/mealLogApi.ts`: copy its style for the API file.
- `src/today/EditMealLog.tsx`: copy its delete-twice pattern and button styles.
- `src/food/CustomFoodForm.tsx`: copy its form and field styles.
- `src/food/customFood.ts` and the first 30 lines of `src/food/customFood.test.ts`: copy their validator and test style.
- `src/pages/Prep.tsx`: the page you replace.

### Write in this order, one step at a time
Steps 1–4 are pure functions with tests. Run `npm test` after each one before you continue.

### 1. `src/prep/week.ts` and `src/prep/week.test.ts`
Dates are `'YYYY-MM-DD'` strings in local time. Weeks start on **Sunday**.
```ts
export function addDays(date: string, n: number): string   // build with new Date(y, m - 1, d + n), format with localDateString
export function weekStart(date: string): string            // the Sunday on or before date
export function weekDays(start: string): string[]          // the 7 dates from start
export function weekLabel(start: string): string           // 'Oct 25 – Oct 31' (an en dash with spaces)
export function dayLabel(date: string): string             // 'Sun Oct 25'
```
For the names, use fixed arrays (`['Sun', …]` and `['Jan', …]`), not `toLocaleDateString`.

Tests, one `it` each:
1. `weekStart('2026-10-28')` (a Wednesday) is `'2026-10-25'`.
2. `weekStart('2026-10-25')` (a Sunday) is `'2026-10-25'`.
3. `weekStart('2026-10-31')` (a Saturday) is `'2026-10-25'`.
4. `weekStart('2027-01-01')` is `'2026-12-27'`.
5. `addDays('2026-10-31', 1)` is `'2026-11-01'`, and `addDays('2026-11-01', 1)` is `'2026-11-02'` (the clocks change that night).
6. `addDays('2026-10-25', -7)` is `'2026-10-18'`.
7. `weekDays('2026-10-25')` has 7 entries, from `'2026-10-25'` to `'2026-10-31'`.
8. `weekLabel('2026-10-25')` is `'Oct 25 – Oct 31'`, and `weekLabel('2026-12-27')` is `'Dec 27 – Jan 2'`.
9. `dayLabel('2026-10-25')` is `'Sun Oct 25'`.

### 2. `src/prep/types.ts`
```ts
export interface Ingredient { name: string; qty: number | null; unit: string }
export interface MealPrep { /* every column above; ingredients: Ingredient[]; status: 'planned' | 'done' */ }
```

### 3. `src/prep/ingredients.ts` and `src/prep/ingredients.test.ts`
```ts
export const UNITS = ['g', 'kg', 'oz', 'lb', 'lbs', 'cup', 'cups', 'tbsp', 'tsp', 'ml', 'l', 'can', 'cans', 'clove', 'cloves', 'pinch']
export function parseIngredients(text: string): Ingredient[]
export function formatIngredients(list: Ingredient[]): string
```
**`parseIngredients`**: one ingredient per line. Trim each line and skip empty lines. Split the line on whitespace.
- If the first piece is a number (`2`, `1.5`, or a fraction such as `1/2`) and it is greater than 0, it is `qty`.
- If there is a `qty` and the next piece, lowercased, is in `UNITS`, it is `unit` (lowercased). Otherwise `unit` is `''`.
- The rest, joined with one space, is `name`.
- If `name` would be empty (for example `2 cups`), use `{ name: <the whole trimmed line>, qty: null, unit: '' }`.

**`formatIngredients`**: one line per item: `qty` (if not null, as `String(qty)`), `unit` (if not empty) and `name`, joined with spaces. Join the lines with `'\n'`.

Tests, one `it` each:

| line | result |
|---|---|
| `'2 cup rice'` | `{ name: 'rice', qty: 2, unit: 'cup' }` |
| `'1.5 lb chicken thighs'` | `{ name: 'chicken thighs', qty: 1.5, unit: 'lb' }` |
| `'1/2 tsp salt'` | `{ name: 'salt', qty: 0.5, unit: 'tsp' }` |
| `'3 eggs'` | `{ name: 'eggs', qty: 3, unit: '' }` |
| `'2 Cans coconut milk'` | `{ name: 'coconut milk', qty: 2, unit: 'cans' }` |
| `'curry roux'` | `{ name: 'curry roux', qty: null, unit: '' }` |
| `'2 cups'` | `{ name: '2 cups', qty: null, unit: '' }` |
| `'0 g sugar'` | `{ name: '0 g sugar', qty: null, unit: '' }` |

Plus:
- blank lines and surrounding spaces are skipped
- `formatIngredients` of the first, fourth and sixth results gives `'2 cup rice\n3 eggs\ncurry roux'`
- parse → format → parse returns the same list

### 4. `src/prep/prepForm.ts` and `src/prep/prepForm.test.ts`
```ts
export interface PrepFormInput { title: string; date: string; startTime: string; duration: string; servings: string; recipeUrl: string; ingredients: string; notes: string }
export type PrepFields = Pick<MealPrep, 'title' | 'scheduled_date' | 'start_time' | 'duration_min' | 'servings' | 'recipe_url' | 'ingredients' | 'notes'>
export function parsePrepForm(input: PrepFormInput):
  | { ok: true; fields: PrepFields }
  | { ok: false; errors: Partial<Record<keyof PrepFormInput, string>> }
export function prepFormFrom(prep: MealPrep): PrepFormInput   // fills the form when editing
```
Trim every field first. Collect all errors, not just the first.

| Field | Rule | Error message |
|---|---|---|
| `title` | required, at most 80 characters | `'Give it a name.'` / `'Keep this under 80 characters.'` |
| `date` | must match `/^\d{4}-\d{2}-\d{2}$/` | `'Pick a date.'` |
| `startTime` | empty → `start_time: null`; `'HH:MM'` → `'HH:MM:00'`; anything else is an error | `'Use a time like 14:30.'` |
| `duration` | empty → 60; otherwise a whole number from 1 to 600 | `'Enter minutes from 1 to 600.'` |
| `servings` | empty → 1; otherwise a whole number from 1 to 50 | `'Enter servings from 1 to 50.'` |
| `recipeUrl` | empty → null; otherwise must start with `http://` or `https://` | `'Links must start with http:// or https://.'` |
| `ingredients` | `parseIngredients(text)` | never errors |
| `notes` | empty → null | never errors |

`prepFormFrom`:
- `start_time` `'18:00:00'` → `'18:00'`, and null → `''`
- numbers become strings
- `ingredients` comes from `formatIngredients`
- null text fields become `''`

Tests, one `it` each:
1. A full valid input gives every field.
2. A minimal input (title and date only) gives the defaults: `start_time` null, 60, 1, `recipe_url` null, `[]`, `notes` null.
3. An empty title and a bad date give both errors.
4. An 81-character title.
5. `startTime: '9:5'` is an error, and `'09:05'` gives `'09:05:00'`.
6. `duration: '0'`, `'601'` and `'1.5'` are errors.
7. `servings: '51'` is an error.
8. `recipeUrl: 'example.com'` is an error, and `'https://example.com'` passes.
9. `prepFormFrom` → `parsePrepForm` round-trips a full row's fields.

### 5. `src/prep/prepApi.ts`
In the style of `mealLogApi.ts`:
```ts
export async function fetchPrepWeek(householdId: string, start: string): Promise<MealPrep[]>
// .from('meal_prep').select('*').eq('household_id', householdId)
// .gte('scheduled_date', start).lte('scheduled_date', addDays(start, 6))
// .order('scheduled_date').order('start_time', { ascending: true, nullsFirst: true })
export async function insertPrep(householdId: string, userId: string, fields: PrepFields): Promise<void>
// inserts { ...fields, household_id, created_by: userId, status: 'planned' } and .select('id'); throws on error
export async function updatePrep(id: string, changes: Partial<PrepFields> & { status?: 'planned' | 'done' }): Promise<void>
export async function deletePrep(id: string): Promise<void>
```
`updatePrep` and `deletePrep` throw `'That prep session could not be changed.'` / `'…could not be deleted.'` when no row comes back, like `mealLogApi.ts`.

### 6. `src/prep/usePrepWeek.ts`
`export function usePrepWeek(start: string)`, a `useQuery` with `queryKey: ['meal-prep', householdId, start]`, `enabled: !!householdId`, and `queryFn: () => fetchPrepWeek(householdId!, start)`.

### 7. `src/prep/PrepForm.tsx`
Props: `{ prep?: MealPrep; date: string; onClose: () => void }`. `prep` means edit mode; otherwise it's a new session on `date`.
- Fields, in this order, styled like `CustomFoodForm`:
  - **Name** (`title`)
  - **Date** (`type="date"`)
  - **Start time** (`type="time"`, optional)
  - **Minutes** and **Servings** side by side (`inputMode="numeric"`)
  - **Recipe link** (`type="url"`, optional)
  - **Ingredients** (a 5-row `textarea`, with the hint `One per line, like 2 cup rice`)
  - **Notes** (a 3-row textarea, optional)
- Show each field's error under it, and clear that field's error when it changes. Every field gets a `<label htmlFor>`.
- **Heading:** `New prep session` or `Edit prep session`.
- **Save:**
  - run `parsePrepForm`
  - if invalid, show the errors
  - otherwise call `insertPrep(profile.household_id, profile.id, fields)`, or `updatePrep(prep.id, fields)` in edit mode, through a `useMutation`
  - on success, `await queryClient.invalidateQueries({ queryKey: ['meal-prep'] })`, then `onClose()`
  - on error, show the message
  - if `profile?.household_id` is missing, show `Join or create a household first.`
- **Delete** (edit mode only): the tap-twice pattern from `EditMealLog`, then `deletePrep`, invalidate and close.
- **Buttons:**
  - **Save:** full width, blue, `Saving…` while pending
  - **Delete:** edit mode only
  - **Cancel:** grey, calls `onClose`
  - all disabled while a request is pending

### 8. Replace `src/pages/Prep.tsx`
- `today = useLocalDate()`. State: `start`, initially `weekStart(today)`; and `editing`, which is `null | { prep?: MealPrep; date: string }`.
- **While `editing` is set,** render only `<PrepForm … onClose={() => setEditing(null)} />`.
- **Otherwise:**
  - **Header row:**
    - `‹` (`aria-label="Previous week"`), the `weekLabel(start)` text, and `›` (`aria-label="Next week"`), each moving `start` by 7 days
    - below it, a `This week` button, only when `start !== weekStart(today)`
  - **`usePrepWeek(start)` states:**
    - **Pending:** `Loading…`
    - **Error:** the message, plus a `Try again` button (`refetch`)
    - **Loaded:** one section per day of `weekDays(start)`:
      - **Heading:** `dayLabel(day)`, plus ` · Today` when `day === today`, and on the right a small `+ Add` button (`aria-label={'Add prep on ' + dayLabel(day)}`) that sets `editing = { date: day }`.
      - **Each session that day,** in a card row:
        - a **main button** (fills the row) showing the title, and below it a grey line of the parts that apply, joined with ` · `:
          - the time as `HH:MM`
          - `${duration_min} min`
          - `${servings} serving(s)`
          - `${ingredients.length} ingredient(s)` when there are any
          
          Tapping it sets `editing = { prep, date: prep.scheduled_date }`.
        - **beside it, a separate status button:**
          - text `Done` (green) when done, `Planned` (grey) when planned
          - `aria-pressed={status === 'done'}`
          - tapping it calls `updatePrep(id, { status: other })` through a `useMutation`, then invalidates `['meal-prep']`
          - a done session's title is shown in grey
      - A day with no sessions shows only its heading row.
    - If the whole week is empty, show `Nothing planned this week. Tap + Add on a day.` above the days.

### Rules
- Create only the files listed and change only `src/pages/Prep.tsx`. Don't run git commands. Don't create `.env` files. Don't add packages. Don't create any other files.
- Write each new file in one write, then fix with small `edit`s. Keep each write under about 150 lines.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm test` passes: the 131 existing tests plus yours. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed.
3. You have re-read this brief, and checked each numbered section and every table row against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI.
- **Wall time:** **19 min 48 s**, 82 steps.
- **Outcome:** finished, and its report was accurate (166 tests, real build lines). This brief was about twice the size of recent ones: 8 sections.
- **It renamed `prepForm.ts` to `formValidation.ts`.** That was right: on Windows, `./prepForm` and `./PrepForm` can resolve to the same file, a slip in my brief.

## Result
- **Builds:** yes. **Tests:** 166 passing (131 + 35).
- **Click-through** at 375 px against the mock, which I taught `meal_prep` before the run:
  - the seeded week shows in time order
  - Planned/Done toggles and is saved
  - add with bad input, then fixed, saves "Chili" with 3 parsed ingredients
  - edit shows the stored values, and changing servings saves
  - delete-twice removes Bob's session
  - the next week shows the empty message and a "This week" link

## What I changed
- **`PrepForm.tsx`:** validation errors were thrown as one combined message at the bottom, so no field ever showed its own error. It now validates first, shows each error under its field, and only then saves.
- **`week.ts`:** the label had no spaces around the dash, and it had edited the test to match its code. Both now follow the brief: `Oct 25 – Oct 31`.
- **`Prep.tsx`:**
  - the error text no longer starts with "Error:"
  - the details line always shows servings ("1 serving") and is pluralised properly
  - the status button is disabled while saving and shows "Try again" on failure (it failed silently before)
  - removed an always-true condition around `+ Add`
- **`ingredients.ts`:** a bare number (`3`) became an ingredient named "3" with qty 3. It is now a name. Added 1 test.
- **`formValidation.ts`:**
  - links must start with `http://` or `https://`, not just `http:`
  - it reuses `formatIngredients` and `PrepFields` instead of keeping second copies

## Verdict
Usable after real fixes. The bigger brief worked: it finished, and every section was there. The misses were in UI behaviour. **Lessons:**
- **Forbid editing tests to match the code:** it changed a test to pass its own week label.
- **Spell out how form errors reach the screen** (a `setErrors` step), not just "show each field's error".
