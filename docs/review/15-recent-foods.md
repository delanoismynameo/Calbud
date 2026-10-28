# 15: Recent foods on the Add food screen

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Users log food: they search, pick a food, choose a serving and log it. Your job: when the search box on the Add food screen is **empty**, show the user's **recent foods**, so a food they eat often takes two taps and no search.

### How the data works
- Every logged food is saved in the `foods` table (one row per household, source and `source_id`; nutrition per 100 g). Columns: `id, household_id, source ('usda' | 'off' | 'custom'), source_id, name, brand, serving_g, serving_label, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, sugar_100g, sodium_mg_100g, is_favorite`.
- Each entry in `meal_logs` has `user_id`, `created_at` and `food_id`, which points at that `foods` row. It can be null.
- So a user's recent foods are the foods behind their own newest meal logs, without duplicates.

### Read only these files
- This file.
- `src/food/types.ts`: `FoodResult`, the shape `ServingPicker` takes.
- `src/food/rows.ts`: `foodRow()` turns a `FoodResult` into a `foods` row. You write the reverse.
- `src/food/rows.test.ts`: the first 25 lines, for the test style.
- `src/pages/AddFood.tsx`: the screen you change.
- `src/food/ServingPicker.tsx`: you change one line in it.
- `src/today/useMealLogs.ts`: an example of a query hook.

### 1. Create `src/food/recents.ts`
```ts
export type FoodRowFromDb = { /* every foods column listed above; numbers as number, text as string; nullable ones | null */ }
export type RecentLogRow = { food_id: string | null; foods: FoodRowFromDb | null }

export function foodResultFromRow(row: FoodRowFromDb): FoodResult
export function recentFoods(rows: RecentLogRow[], limit = 10): FoodResult[]
```
- **`foodResultFromRow`** is the reverse of `foodRow()`:
  - `sourceId` is `row.source_id ?? ''`
  - `barcode` is `row.source_id` when `source` is `'off'`, and `null` otherwise
  - wrap every number in `Number(…)`, because Postgres numerics can arrive as strings
  - keep the nullable ones (`serving_g`, `fiber_100g`, `sugar_100g`, `sodium_mg_100g`) as `null` when null
- **`recentFoods`**: `rows` come newest first. Go through them in order and:
  - skip rows where `foods` is null
  - skip foods whose `source` is `'custom'` (custom foods come in a later task)
  - skip a food whose `foods.id` has already been taken
  - stop once `limit` foods are taken
  - return them converted with `foodResultFromRow`, in that order (newest first)

### 2. Create `src/food/recents.test.ts`
Vitest, in the style of `rows.test.ts`. Build rows with a small helper. Tests, one `it` each:
1. Converts a row: every `FoodResult` field has the right value. Use a `'usda'` row with `serving_g: 240` and `serving_label: '1 cup'`, and `barcode` is `null`.
2. An `'off'` row gets `barcode` equal to its `source_id`.
3. String numbers (`kcal_100g: '71'` cast through `unknown`) become numbers.
4. Keeps newest-first order.
5. The same food twice appears once, at the position of its newest log.
6. Rows with `foods: null` are skipped.
7. `'custom'` foods are skipped.
8. `limit` is respected: 12 different foods with `limit` 10 gives 10, the first 10.
9. An empty array gives `[]`.

### 3. Create `src/food/useRecentFoods.ts`
`export function useRecentFoods()`, a `useQuery` like `useMealLogs`:
- `queryKey: ['recent-foods', userId]`, `enabled: !!userId`
- query:
  ```ts
  supabase.from('meal_logs')
    .select('food_id, foods(*)')
    .eq('user_id', userId)
    .not('food_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)
  ```
  On `error`, throw `new Error(error.message)`. Otherwise return `recentFoods(data as unknown as RecentLogRow[])`.

### 4. Change `src/food/ServingPicker.tsx`
In the mutation's `onSuccess`, after the existing `invalidateQueries({ queryKey: ['meal-logs'] })` line, add `await queryClient.invalidateQueries({ queryKey: ['recent-foods'] })`. Change nothing else in that file.

### 5. Change `src/pages/AddFood.tsx`
Keep everything that's there. Add:
- `const recents = useRecentFoods()`, and `const empty = query.trim() === ''`.
- The `Type at least 2 letters.` line now shows only when `tooShort && !empty`.
- When `empty` (and no food is selected), below the search box:
  - while `recents.isPending`: nothing
  - if `recents.isError`: `<p className="text-gray-500 text-xs px-2">Couldn't load recent foods.</p>`
  - if loaded and the list is empty: `<p className="text-gray-400 text-center py-6">Foods you log will show up here.</p>`
  - otherwise: a heading `<h2 className="text-sm font-semibold text-gray-400 px-1">Recent</h2>`, then one button per food, **styled exactly like the search result buttons**: name, brand line if any, and the `kcal / 100 g` line, but **without the Basic/Packaged badge**. Use the key `` `${food.source}:${food.sourceId}` ``. Clicking it calls `setSelected(food)`, the same as a search result.

### Rules
- Don't change any other file. Don't run git commands. Don't create `.env` files. Don't add packages.
- Write each new file in one write, then fix with small `edit`s.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm test` passes: the 63 existing tests plus your 9. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed.
3. You have re-read this brief, and checked each numbered section against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.
