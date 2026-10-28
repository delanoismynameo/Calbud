# 16: Favorite foods

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Two partners share a **household** and log food. The Add food screen already shows **Recent** foods when the search box is empty. Your job: let them **star** a food as a favorite. Favorites belong to the **household** (both partners see the same ones) and show above Recent.

### How the data works
- Foods are saved in the `foods` table, one row per `household_id` + `source` + `source_id`. It has a boolean column **`is_favorite`** (default false). Household members are allowed to read, insert and update their household's foods.
- `foodRow(food, householdId)` in `src/food/rows.ts` builds a `foods` row from a `FoodResult`, **without** `is_favorite`. `logFood.ts` upserts that row with `{ onConflict: 'household_id,source,source_id' }`. Because `is_favorite` isn't in that row, logging a food never changes its favorite flag. Keep it that way.
- `foodResultFromRow(row)` in `src/food/recents.ts` turns a `foods` row back into a `FoodResult`.

### Read only these files
- This file.
- `src/food/types.ts`, `src/food/rows.ts`, `src/food/recents.ts`, `src/food/useRecentFoods.ts`
- `src/food/recents.test.ts`: the first 40 lines, for the test style and its row helper.
- `src/food/logFood.ts`: how the upsert is written.
- `src/food/ServingPicker.tsx` and `src/pages/AddFood.tsx`: the two screens you change.

### 1. Create `src/food/favorites.ts`
```ts
export function foodKey(food: FoodResult): string          // `${food.source}:${food.sourceId}`
export function favoriteRow(food: FoodResult, householdId: string, on: boolean) // { ...foodRow(food, householdId), is_favorite: on }
export function withoutFavorites(recents: FoodResult[], favorites: FoodResult[]): FoodResult[]
export async function setFavorite(food: FoodResult, householdId: string, on: boolean): Promise<void>
```
- `withoutFavorites` returns `recents` in the same order, minus every food whose `foodKey` is also in `favorites`.
- `setFavorite` upserts `favoriteRow(food, householdId, on)` into `foods` with `{ onConflict: 'household_id,source,source_id' }`, like `logFood.ts` does. On `error`, it throws `new Error(error.message)`. An upsert is used because a food picked from search may not have a row yet.

### 2. Create `src/food/favorites.test.ts`
Vitest, same style as `recents.test.ts`. One `it` each:
1. `foodKey` gives `'usda:123'` for a usda food with `sourceId` `'123'`.
2. `favoriteRow(food, 'h1', true)` has `is_favorite: true`, `household_id: 'h1'`, and the same `name`, `source` and `source_id` as the food.
3. `favoriteRow(food, 'h1', false)` has `is_favorite: false`.
4. `withoutFavorites` removes a recent that's also a favorite and keeps the others **in order**.
5. `withoutFavorites` with no favorites returns all recents unchanged.
6. A usda food and an off food with the **same** `sourceId` are different foods: a favorite on one doesn't remove the other.

(`setFavorite` calls Supabase; don't test it.)

### 3. Create `src/food/useFavoriteFoods.ts`
`export function useFavoriteFoods()`, a `useQuery` like `useRecentFoods`, but keyed by **household**:
- Get `householdId` from `useProfile()` (`profile?.household_id`; import from `'../household/useProfile'`).
- `queryKey: ['favorite-foods', householdId]`, `enabled: !!householdId`
- query:
  ```ts
  supabase.from('foods')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_favorite', true)
    .neq('source', 'custom')
    .order('name')
  ```
  On `error`, throw `new Error(error.message)`. Otherwise return `(data as FoodRowFromDb[]).map(foodResultFromRow)`.

### 4. Change `src/food/ServingPicker.tsx`: a star button
- Next to the food's name at the top, a button showing `★` when the food is a favorite and `☆` when it isn't. Put the name block and the button in a `flex items-start justify-between gap-3` row. Button classes: `text-2xl leading-none px-2 py-1 rounded hover:bg-slate-700`, plus `text-yellow-400` when on and `text-gray-400` when off.
- `aria-pressed={isFavorite}` and `aria-label` of `Remove from favorites` when on and `Add to favorites` when off.
- `isFavorite` means the food's `foodKey` is in `useFavoriteFoods().data`.
- Clicking runs a **second** `useMutation` (separate from the log one): `setFavorite(food, profile!.household_id!, !isFavorite)`. `onSuccess`: `await queryClient.invalidateQueries({ queryKey: ['favorite-foods'] })`.
- The button is disabled while that mutation runs, or while the favorites query `isPending`.
- If that mutation fails, show its message under the button row in `text-red-400 text-sm`.
- Change nothing else in the file. The Log button, meal buttons and amounts stay as they are.

### 5. Change `src/pages/AddFood.tsx`
In the existing "search box empty" block, keep the current pending, error and empty handling of recents, and add favorites **above** Recent:
- `const favorites = useFavoriteFoods()`
- When `favorites.data` has foods: a heading `<h2 className="text-sm font-semibold text-gray-400 px-1">Favorites</h2>`, then one button per favorite, styled and behaving **exactly like the Recent buttons** (`setSelected(food)` on click, the same key format).
- The Recent list now shows `withoutFavorites(recents.data, favorites.data ?? [])`, so a food is never listed twice.
- `Foods you log will show up here.` shows only when **both** lists are empty after filtering, and recents has loaded.
- A failed favorites query shows `<p className="text-gray-500 text-xs px-2">Couldn't load favorites.</p>`.

### Rules
- Don't change any other file. Don't run git commands. Don't create `.env` files. Don't add packages.
- Write each new file in one write, then fix with small `edit`s.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm test` passes: the 77 existing tests plus your 6. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed.
3. You have re-read this brief and checked each numbered section against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.
