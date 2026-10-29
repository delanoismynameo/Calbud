# 30: Copy to other days, and Repeat last week

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Two features for the Prep page, both to save typing:
1. **Copy to other days:** in the menu slot editor, tick other days of the same week to put the same meal on them too.
2. **Repeat last week:** a button on the Menu tab and one on the Plan tab that copies last week's entries into the week on screen.

### Already done (don't redo)
- **Menu:** `src/menu/menuApi.ts` has `fetchMenuWeek`, `saveSlot` (an upsert on `household_id,slot_date,meal`) and `clearSlot`. `menu_slots` has `household_id, slot_date, meal, label, prep_id`.
- **Prep:** `src/prep/prepApi.ts` has `fetchPrepWeek` and `insertPrep`. `meal_prep` rows are shaped by `MealPrep` and `PrepFields` in `src/prep/types.ts`.
- **Dates:** `addDays(date, n)` and `dayLabel(date)` in `src/prep/week.ts`.

### Read only these files
- This file.
- `src/menu/SlotEditor.tsx`, `src/menu/menu.ts`, `src/menu/menuApi.ts`, `src/menu/types.ts`, and the first 25 lines of `src/menu/menu.test.ts` for the test style.
- `src/prep/prepApi.ts`, `src/prep/types.ts`, `src/prep/week.ts`.
- `src/pages/Prep.tsx`.

### Write in this order. Run `npm test` after step 2 before you continue.

### 1. `src/menu/menu.ts`: three pure functions (add them; change nothing existing)
```ts
export interface SlotRow { slot_date: string; meal: MenuMeal; label: string; prep_id: string | null }

// Slots to write so `meal` on each of `dates` gets this label and prep_id. Dates equal to `from` are skipped.
export function copyRows(from: string, meal: MenuMeal, label: string, prepId: string | null, dates: string[]): SlotRow[]

// Last week's slots moved forward 7 days. Skip any whose date+meal is already filled in `thisWeek`.
// prep_id is always null: last week's dishes don't exist this week.
export function repeatMenuRows(lastWeek: MenuSlot[], thisWeek: MenuSlot[]): SlotRow[]
```
and, in the new file `src/prep/repeat.ts`:
```ts
// Last week's sessions moved forward 7 days, as PrepFields plus food_id. Skip any session whose
// title AND new scheduled_date already exist in `thisWeek`. Status is not part of the result.
export function repeatPrepRows(lastWeek: MealPrep[], thisWeek: MealPrep[]): (PrepFields & { food_id: string | null })[]
```
- `repeatPrepRows` keeps `title, start_time, duration_min, servings, recipe_url, ingredients, notes, food_id` unchanged and sets `scheduled_date` to `addDays(old, 7)`.
- Keep the order of the input.

### 2. Tests: `src/menu/menu.test.ts` (add) and `src/prep/repeat.test.ts` (new)
One `it` each: 1–5 go in `menu.test.ts`, 6–8 in `repeat.test.ts`. Build the data with small helper functions in the test file.
1. `copyRows('2026-03-01', 'dinner', 'Curry', null, ['2026-03-01', '2026-03-03'])` equals `[{ slot_date: '2026-03-03', meal: 'dinner', label: 'Curry', prep_id: null }]`.
2. `copyRows` with `prepId` `'p1'` keeps `prep_id: 'p1'` on every row.
3. `repeatMenuRows`: a lunch on `2026-03-01` and a dinner on `2026-03-02`, with `thisWeek` empty, gives the same two meals on `2026-03-08` and `2026-03-09`, both with `prep_id: null`, even when last week's slot had a `prep_id`.
4. `repeatMenuRows`: if `thisWeek` already has a slot on `2026-03-08` lunch, that one is skipped and the dinner is kept.
5. `repeatMenuRows([], [])` equals `[]`.
6. `repeatPrepRows`: a session `Curry` on `2026-03-01` (start_time `'17:00:00'`, 60 min, 4 servings, one ingredient, `food_id: 'f1'`) becomes the same fields on `2026-03-08`, with `food_id: 'f1'`.
7. `repeatPrepRows`: it is skipped when `thisWeek` has a session titled `Curry` on `2026-03-08`, but kept when the existing `Curry` is on a different date, or another title is on that date.
8. A month boundary: `2026-02-27` becomes `2026-03-06`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 3. API
- **`src/menu/menuApi.ts`:** add
  `export async function saveSlots(householdId: string, rows: SlotRow[]): Promise<void>`
  One `upsert` of all rows (each with `household_id` added) with `{ onConflict: 'household_id,slot_date,meal' }`, then `.select('id')`. Throw `new Error(error.message)` on error. Do nothing when `rows` is empty. Import `SlotRow` as a type from `./menu`.
- **`src/prep/prepApi.ts`:** add
  `export async function insertPreps(householdId: string, userId: string, rows: (PrepFields & { food_id: string | null })[]): Promise<void>`
  One `insert` of all rows, each with `household_id`, `created_by: userId` and `status: 'planned'` added, then `.select('id')`. Same error rule, and do nothing when `rows` is empty.

### 4. Copy to other days in `src/menu/SlotEditor.tsx`
The editor already has `date`, `meal`, `slot`, `text`, `prepId`, `dishes`. Add the days of the same week, `weekDays(weekStart(date))`, except `date` itself.
- **New state:** `picked: string[]` (start empty).
- **The section,** between the "Or type it" field and the error lines:
  - a label `Also put it on` in `text-gray-400 text-sm mb-1`
  - a `flex flex-wrap gap-2` row with one button per other day. A button shows `dayLabel(day).slice(0, 3)` (for example `Tue`), has `aria-pressed={picked.includes(day)}`, `type="button"`, `disabled={anyPending}`, and the same classes as the dish buttons (selected blue, otherwise slate).
  - a day that already has a slot in the menu is marked with `*` after its name. You don't have the week's slots in this component, so add a prop `filled: string[]` (dates for the same `meal` that already have a slot) and pass it from Prep (step 6).
  - under the row, **only if some picked day is in `filled`**, `text-gray-500 text-xs mt-1`: `* already has a meal. Saving replaces it.`
- **Save:** after `parseSlotLabel` passes, call the mutation as before. Inside `mutationFn`, after `saveSlot(...)` for this day, call `saveSlots(profile.household_id, copyRows(date, meal, label, prepId, picked))`. `label` is the argument of `mutationFn`.
- **Clear** does not touch `picked`.

### 5. Repeat last week: a component `src/prep/RepeatButton.tsx` (new)
```tsx
export default function RepeatButton({ kind, start }: { kind: 'menu' | 'prep'; start: string })
```
- **Data:** `const { profile } = useProfile()` and `const { session } = useAuth()` (copy the imports from `src/household/GoalsCard.tsx`). Render `null` while `profile?.household_id` is missing.
- **State:** a message string or `null`.
- **The button:** `type="button"`, `text-sm text-blue-400 underline`, text `Repeat last week`, centred in a `px-3 py-3 text-center` wrapper. While working it reads `Copying…` and is disabled.
- **Clicking:**
  1. `last = addDays(start, -7)`
  2. for `'menu'`: fetch both weeks with `fetchMenuWeek(householdId, last)` and `fetchMenuWeek(householdId, start)`, compute `repeatMenuRows(lastWeek, thisWeek)`, then `saveSlots`. Invalidate `['menu']`.
  3. for `'prep'`: the same with `fetchPrepWeek`, `repeatPrepRows` and `insertPreps(householdId, session!.user.id, rows)`. Invalidate `['meal-prep']`.
  4. message: `Nothing to copy.` when the rows are empty (and write nothing); otherwise `Copied N meals.` for menu or `Copied N sessions.` for prep, with `1 meal` / `1 session` for one.
  5. on error, show its `message` in `text-red-400 text-sm`.
- Use `useMutation` like `SlotEditor` does. The message stays on screen until the next click or until `start` changes (use `key={start}` where you render it, so it resets).

### 6. `src/pages/Prep.tsx`
- On the **Menu** tab, render `<RepeatButton kind="menu" start={start} key={start} />` right after the hint paragraph.
- On the **Plan** tab, render `<RepeatButton kind="prep" start={start} key={start} />` right after the day list (inside the same fragment, after the `weekDays(start).map(...)`).
- Don't show it on the Grocery tab.
- Pass `filled` to `SlotEditor`: `(menu.data ?? []).filter(s => s.meal === slotEditing.meal).map(s => s.slot_date)`.
- Change nothing else on the page.

### Rules
- **Files:**
  - create only `src/prep/repeat.ts`, `src/prep/repeat.test.ts` and `src/prep/RepeatButton.tsx`
  - change only `src/menu/menu.ts`, `src/menu/menu.test.ts`, `src/menu/menuApi.ts`, `src/menu/SlotEditor.tsx`, `src/prep/prepApi.ts` and `src/pages/Prep.tsx`
- **Don't:**
  - run git commands, create `.env` files, or add packages
  - create any other files, including files for build output: read the build's output in the terminal
- **Writing:** write each new file in one write, then fix with small `edit`s. Keep JSX ternaries shallow. In JSX text, write `*` and `…` as plain characters, never as HTML entities or numbers.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 8 new ones (tests 1–5 in `menu.test.ts`, 6–8 in `repeat.test.ts`). **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste its last 5 lines.**
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:**  at **High**, Full access, web UI. One brief.
- **Wall time:** about **8 min**, 43 steps.
- **Outcome:** finished. It **overwrote this note's empty Run/Result/Verdict sections** with its own report (this file had been in its to-read list). I restored the note.

## Result
- **Builds:** yes. **Tests:** 236 passing (228 + 8).
- **Click-through** at 375 px against the mock, with last week seeded:
  - **Menu, Repeat last week:**  (Soup moved to Mon). Tacos was skipped because Thu dinner was already filled. A second click:   - **Plan, Repeat last week:**  Chili came over as .
  - **Slot editor:** the Thu button read  and the replace note showed. Picking Tue, Wed, Fri and then un-picking Wed saved Pasta on Sun, Tue and Fri only.

## What I changed
- **:**  came before , so the hook count would change when the profile loaded (a crash). Guard moved below the hook. Also  became , and the message clears at each click.
- **:** removed an unused  import and .
- **:** removed an  and its eslint comment; the build passes without them (it blamed supabase-js types).
- **:** merged a duplicate import.
- **:** the day toggle uses the functional , so two quick taps can't lose one.
- **:**  and  POST now accept arrays, as the real API does.

## Verdict
Usable after small fixes. Lessons: don't list the brief's own note file where the model can edit it, and say "never edit files under docs/".
