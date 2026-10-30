# 70: Shared grocery list, part 1: data layer

Read `docs/review/features-common.md` first and follow it.

## What and why
Grocery items added by hand (`src/prep/extras.ts`) and the ticks next to items (`localStorage` in `GroceryList.tsx`) live in one phone's browser, so the two partners see different lists. The database now has two shared tables (migration `supabase/migrations/20261030000001_grocery.sql`, already written; read it, do not change it):

- `grocery_extras (household_id, week_start, key, name, qty, unit, created_at)`, primary key `(household_id, week_start, key)`. `week_start` is the week's start date `'YYYY-MM-DD'`. `key` is `groceryKey(item)` from `./grocery`. `qty` is a number or null.
- `grocery_ticks (household_id, week_start, key)`, primary key the same three columns. A row means "ticked".

This brief writes the code that talks to them. Part 2 (task 71) switches the screens over; do not touch `GroceryList.tsx` or `RecipeList.tsx` here.

## Files
- New: `src/prep/groceryApi.ts`, `src/prep/useGrocery.ts`, `src/prep/useGroceryRealtime.ts`
- Edit: `src/pages/Prep.tsx` (one line). Do not change `extras.ts`: its `mergeExtras` is used here, and the rest is cleaned up in part 2.

## Steps
1. **`groceryApi.ts`** (copy the style of `prepApi.ts`: `supabase` from `'../lib/supabase'`, throw `new Error(error.message)` on error). Export:
   - `fetchGroceryExtras(householdId: string, weekStart: string): Promise<GroceryItem[]>`: select `name, qty, unit` from `grocery_extras` where `household_id` and `week_start` match, ordered by `created_at`. Return rows as `GroceryItem[]` (`qty` is `number | null`; if Supabase gives it as a string, convert with `Number`).
   - `upsertGroceryExtras(householdId: string, weekStart: string, items: GroceryItem[]): Promise<void>`: do nothing for an empty array; otherwise `.upsert(items.map(i => ({ household_id: householdId, week_start: weekStart, key: groceryKey(i), name: i.name, qty: i.qty, unit: i.unit })), { onConflict: 'household_id,week_start,key' })`. No `.select()`.
   - `deleteGroceryExtra(householdId: string, weekStart: string, key: string): Promise<void>`: delete where household, week and key match.
   - `fetchGroceryTicks(householdId: string, weekStart: string): Promise<string[]>`: the `key` column of the matching `grocery_ticks` rows.
   - `addGroceryTicks(householdId: string, weekStart: string, keys: string[]): Promise<void>`: nothing for an empty array; otherwise upsert rows `{ household_id, week_start, key }` with `{ onConflict: 'household_id,week_start,key', ignoreDuplicates: true }`.
   - `removeGroceryTick(householdId: string, weekStart: string, key: string): Promise<void>` and `clearGroceryTicks(householdId: string, weekStart: string): Promise<void>` (deletes every tick of that week).
2. **`useGrocery.ts`** (copy the style of `usePrepWeek.ts`; `useProfile` gives `profile?.household_id`). Export these hooks. Query keys start with a fixed word so realtime can invalidate them: `['grocery-extras', householdId, weekStart]` and `['grocery-ticks', householdId, weekStart]`.
   - `useGroceryExtras(weekStart)`: `useQuery`, enabled when there is a household, returns the query result (data is `GroceryItem[]`).
   - `useGroceryTicks(weekStart)`: `useQuery` returning the query result (data is `string[]`).
   - `useAddGroceryExtras(weekStart)`: returns a `useMutation` whose `mutationFn` takes `GroceryItem[]` to add. It reads the current extras with `queryClient.getQueryData<GroceryItem[]>(['grocery-extras', householdId, weekStart]) ?? []`, computes `const merged = mergeExtras(current, added)` (from `./extras`), upserts `merged` with `upsertGroceryExtras`, and `onSuccess` invalidates `['grocery-extras']`. Throw `new Error('Join or create a household first.')` when there is no household.
   - `useRemoveGroceryExtra(weekStart)`: mutation taking a `key: string`; calls `deleteGroceryExtra`; `onSuccess` invalidates `['grocery-extras']`.
   - `useToggleGroceryTick(weekStart)`: mutation taking `{ key: string; ticked: boolean }` (the new state). `onMutate`: cancel queries `['grocery-ticks', householdId, weekStart]`, take the previous array, set the query data to the new array (add or remove the key), return `{ previous }`. `mutationFn`: `ticked ? addGroceryTicks(h, weekStart, [key]) : removeGroceryTick(h, weekStart, key)`. `onError`: put `previous` back. `onSettled`: invalidate `['grocery-ticks']`.
   - `useSetGroceryTicks(weekStart)`: mutation taking `string[]` (every key to tick) that calls `addGroceryTicks`; `onSuccess` invalidates `['grocery-ticks']`.
   - `useClearGroceryTicks(weekStart)`: mutation with no argument that calls `clearGroceryTicks`; `onSuccess` invalidates `['grocery-ticks']`.
   Import `queryClient` from `'../lib/queryClient'` (as `Prep.tsx` does) and use `useMutation`/`useQuery` from `@tanstack/react-query`.
3. **`useGroceryRealtime.ts`** (copy `usePrepRealtime.ts`): `export function useGroceryRealtime(householdId: string | null | undefined): void`. One channel `grocery-${householdId}` with `postgres_changes` for `INSERT`, `UPDATE` and `DELETE` on both tables (`grocery_extras`, `grocery_ticks`), INSERT and UPDATE with `filter: household_id=eq.${householdId}`, DELETE without a filter (Realtime cannot filter deletes). Extras events invalidate `['grocery-extras']`; tick events invalidate `['grocery-ticks']`.
4. **`Prep.tsx`:** next to `usePrepRealtime(profile.profile?.household_id)` add `useGroceryRealtime(profile.profile?.household_id)` and its import.

## Done means
- `npx tsc -b` passes (Claude runs it). No new tests are needed.
- Reply as in `features-common.md`.
