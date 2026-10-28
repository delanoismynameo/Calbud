# 22: Grocery list and live updates on the Prep page

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase (`@supabase/supabase-js` 2.118). The **Prep** page (`src/pages/Prep.tsx`) shows one week of shared meal-prep sessions. Each session has a list of `ingredients` (`{ name, qty, unit }`). Your job has three parts:
1. a **grocery list** that merges the ingredients of the week's *planned* sessions
2. a **Plan / Grocery list switch** on the Prep page
3. **live updates**, so when one partner changes a session, the other phone's Prep page refreshes by itself

### Read only these files
- This file.
- `src/prep/types.ts`: `Ingredient`, `MealPrep`.
- `src/prep/ingredients.ts` and the first 25 lines of `src/prep/ingredients.test.ts`, for the style.
- `src/pages/Prep.tsx`: the page you change.
- `src/lib/supabase.ts` and `src/lib/queryClient.ts`.
- `src/household/useProfile.ts`.

### Write in this order. Run `npm test` after step 1 before you continue.

### 1. `src/prep/grocery.ts` and `src/prep/grocery.test.ts`
```ts
export interface GroceryItem { name: string; qty: number | null; unit: string }
export function groceryList(lists: GroceryItem[][]): GroceryItem[]
export function formatGroceryItem(item: GroceryItem): string
export function groceryKey(item: GroceryItem): string
```
**`groceryList`** merges several ingredient lists into one shopping list:
1. Go through every item of every list, in order.
2. **Key:**
   - the name, trimmed and lowercased
   - plus the unit, lowercased, with plurals made singular: `cups` → `cup`, `lbs` → `lb`, `cans` → `can`, `cloves` → `clove`
   - plus whether `qty` is null
3. **Merging:**
   - items with the same key and a number `qty` are **added together**
   - items with the same key and `qty: null` become **one** item with `qty: null`
   - a number item and a null item with the same name and unit stay **separate**
4. Keep the **first** spelling of the name (trimmed), and use the singular unit.
5. Round each total: `Math.round(x * 100) / 100`.
6. Sort by lowercased name, A to Z, with `localeCompare`. For equal names, number items come before null items. Otherwise keep the order of first appearance; `Array.prototype.sort` is stable.

**`formatGroceryItem`**: `qty` (if not null, as `String(qty)`), `unit` (if not empty) and `name`, joined with single spaces. There is never a leading or trailing space.

**`groceryKey`**: `` `${name.trim().toLowerCase()}|${unit}|${qty === null ? 'n' : 'q'}` ``. It identifies a merged item when ticking it off.

Tests, one `it` each, inside `describe('groceryList', …)` and so on:
1. `groceryList([])` is `[]`.
2. `[[{ name: 'rice', qty: 2, unit: 'cup' }], [{ name: 'Rice', qty: 1, unit: 'cups' }]]` gives `[{ name: 'rice', qty: 3, unit: 'cup' }]`.
3. `[[{ name: 'eggs', qty: 3, unit: '' }, { name: 'eggs', qty: 2, unit: '' }]]` gives `[{ name: 'eggs', qty: 5, unit: '' }]`.
4. `[[{ name: 'chicken', qty: 1, unit: 'lb' }, { name: 'chicken', qty: 200, unit: 'g' }]]` gives `[{ name: 'chicken', qty: 1, unit: 'lb' }, { name: 'chicken', qty: 200, unit: 'g' }]`. The units differ, so they are not added, and equal names keep input order.
5. `[[{ name: 'salt', qty: null, unit: '' }], [{ name: 'salt', qty: null, unit: '' }]]` gives `[{ name: 'salt', qty: null, unit: '' }]`.
6. `[[{ name: 'garlic', qty: null, unit: '' }, { name: 'garlic', qty: 2, unit: 'cloves' }]]` gives `[{ name: 'garlic', qty: 2, unit: 'clove' }, { name: 'garlic', qty: null, unit: '' }]`.
7. `[[{ name: 'oil', qty: 0.1, unit: 'cup' }, { name: 'oil', qty: 0.2, unit: 'cup' }]]` gives `qty` `0.3`.
8. `[[{ name: 'onion', qty: 1, unit: '' }, { name: 'Basil', qty: null, unit: '' }, { name: 'carrot', qty: 2, unit: '' }]]` gives names `['Basil', 'carrot', 'onion']`.
9. `formatGroceryItem` gives `'2.5 cup rice'` for `{ name: 'rice', qty: 2.5, unit: 'cup' }`, `'3 eggs'` for `{ name: 'eggs', qty: 3, unit: '' }`, and `'salt'` for `{ name: 'salt', qty: null, unit: '' }`.
10. `groceryKey({ name: ' Rice ', qty: 3, unit: 'cup' })` is `'rice|cup|q'`, and `groceryKey({ name: 'salt', qty: null, unit: '' })` is `'salt||n'`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's expected value is wrong, say so in your reply and leave the test as written.

### 2. `src/prep/GroceryList.tsx`
Props: `{ sessions: MealPrep[]; weekStart: string }`.
- `items = groceryList(sessions.filter(s => s.status === 'planned').map(s => s.ingredients))`.
- **Ticked items** are a `Set<string>` of `groceryKey`s, kept in `localStorage` under `` `calbud:grocery:${weekStart}` `` as a JSON array:
  - read it when the component mounts, or when `weekStart` changes
  - write it on every change
  - wrap every `localStorage` read and write in `try/catch`; on failure, just keep the state in memory
- **Render:**
  - a heading `Grocery list`, with a grey line below: `From N planned session(s)`, singular for 1
  - **if `items` is empty:** `No ingredients in this week's planned sessions.` in grey, centred
  - **otherwise, one row per item:**
    - a `<label>` with an `<input type="checkbox">` and the `formatGroceryItem(item)` text
    - a ticked row's text is grey with a line through it
    - each row is at least 44 px tall, so it's easy to tap on a phone
  - **below the list, when anything is ticked:** a `Clear ticks` button, which empties the set

### 3. `src/prep/usePrepRealtime.ts`
```ts
export function usePrepRealtime(householdId: string | null | undefined): void
```
A `useEffect` on `[householdId]`. If there is no `householdId`, do nothing. Otherwise:
```ts
const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['meal-prep'] }) }
const channel = supabase
  .channel(`meal-prep-${householdId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meal_prep', filter: `household_id=eq.${householdId}` }, refresh)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meal_prep', filter: `household_id=eq.${householdId}` }, refresh)
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meal_prep' }, refresh)
  .subscribe()
return () => { void supabase.removeChannel(channel) }
```
The DELETE listener has **no filter on purpose**. Supabase sends only the deleted row's id on DELETE, so a `household_id` filter would never match. Copy this exactly.

### 4. Change `src/pages/Prep.tsx`
- Get `profile` from `useProfile()` and call `usePrepRealtime(profile?.household_id)` near the top. It must run before the early `return` for the form; hooks can't come after an early return.
- Add state `view`, either `'plan'` or `'grocery'`, starting at `'plan'`.
- **The switch:** below the week header (and the `This week` button), and above the loading, error and day list, add a two-button segmented row:
  - the labels are `Plan` and `Grocery list`
  - each button has `aria-pressed`
  - the active one is `bg-blue-600 text-white`, the other `bg-slate-800 text-gray-300`
  - together they take the full width, each button half
- **When `view === 'grocery'` and the data is loaded,** render `<GroceryList sessions={data} weekStart={start} />` instead of the empty-week message and the day sections. Loading and error look the same as now in both views.
- Change nothing else on the page.

### Rules
- Create only the files listed and change only `src/pages/Prep.tsx`. Don't run git commands. Don't create `.env` files. Don't add packages. Don't create any other files.
- Write each new file in one write, then fix with small `edit`s.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm test` passes: the 167 existing tests plus your 10. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed.
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI.
- **Wall time:** about **8 min**, 35 steps. About 6 of those minutes went on one JSX bracket mistake in `Prep.tsx`, which it fixed by rewriting the block.
- **Outcome:** finished.
  - **First test count:** it first wrote 12 tests, then merged two to match the brief's 10.
  - **Build lines:** its pasted lines were real, but not the last 5. It showed the `dist/` sizes rather than the PWA lines.
  - **No test edits:** it didn't change any expected values. The new rule against that held.

## Result
- **Builds:** yes. **Tests:** 177 passing (167 + 10).
- **Click-through** at 375 px against the mock, with an extra session added through the mock (`1 cups Rice`, `3 eggs`, `curry roux`):
  - "Grocery list" shows `4 cup rice` (3 + 1, and "cups" counted as "cup"), `curry roux` once, `3 eggs`, `2 lb chicken thighs` and `2 tofu`
  - Bob's done Meatballs is left out, and the list says "From 3 planned sessions"
  - ticks are saved per week (`calbud:grocery:2026-10-25`) and survive a reload
  - the next week starts with no ticks and shows the empty message
  - going back restores the ticks, and "Clear ticks" empties them
- **Realtime:** the page tries to open the Realtime WebSocket. The mock has none, so it fails as expected. **Not verified end to end:** that needs two signed-in phones on the live site.

## What I changed
Nothing.

## Verdict
Usable as delivered. The explicit "never change a test's expected value" rule held. Copying the Realtime code into the brief word for word kept it right.
