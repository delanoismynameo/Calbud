# 68: Recipes page (everything we have made)

Read `docs/review/features-common.md` first and follow it.

## What and why
Every dish is a `meal_prep` row ("prep session") that lives on one date, so old dishes are only visible by paging back week by week. Add a fourth tab on the Prep screen, "Recipes", that lists every dish the household has ever planned or made, once per dish, with its ingredients, notes and link.

## Files
- New: `src/prep/recipes.ts`, `src/prep/recipes.test.ts`, `src/prep/useAllPreps.ts`, `src/prep/RecipeList.tsx`
- Edit: `src/prep/prepApi.ts` (add one function at the end), `src/pages/Prep.tsx`

## Steps
1. **`prepApi.ts`:** add
   ```ts
   export async function fetchAllPreps(householdId: string): Promise<MealPrep[]> {
     const { data, error } = await supabase
       .from('meal_prep')
       .select('*, foods(*)')
       .eq('household_id', householdId)
       .order('scheduled_date', { ascending: false })
       .limit(500)
     if (error) throw new Error(error.message)
     return data ?? []
   }
   ```
2. **`useAllPreps.ts`:** copy `usePrepWeek.ts`'s shape: `useQuery` with key `['meal-prep', householdId, 'all']` (it must start with `'meal-prep'` so existing invalidations refresh it), enabled when there is a household, `queryFn: () => fetchAllPreps(householdId!)`.
3. **`recipes.ts`** (pure, no React, no Supabase): export
   ```ts
   export interface Recipe {
     key: string            // title trimmed and lower-cased
     title: string          // the title as written on the newest session
     sessions: number       // all sessions with this title
     made: number           // sessions with status 'done'
     lastDate: string       // newest scheduled_date, 'YYYY-MM-DD'
     servings: number
     ingredients: Ingredient[]
     notes: string | null
     recipeUrl: string | null
   }
   export function recipesFrom(preps: MealPrep[]): Recipe[]
   ```
   Group by `title.trim().toLowerCase()`. The newest session (largest `scheduled_date`, ties broken by `created_at`) supplies `title`, `servings`, `ingredients` and `notes`; `recipeUrl` is the newest non-null `recipe_url` in the group. Skip rows whose trimmed title is empty. Sort the result by `lastDate` descending, then `title` ascending (`localeCompare`). Import types from `./types`.
4. **`recipes.test.ts`:** vitest tests (copy the import style of `grocery.test.ts`) for: empty input; two sessions with titles `Curry` and ` curry ` become one recipe with `sessions: 2`; `made` counts only `done`; the newest session's ingredients and servings win; sort order; a blank title is skipped. Build test rows with a small helper that fills every `MealPrep` field (`foods: null`, `food_id: null`, `created_at: '2026-01-01T00:00:00Z'`, and so on).
5. **`RecipeList.tsx`:** default export `RecipeList()` with no props yet. It uses `useAllPreps()` and `recipesFrom`. Layout:
   - Loading: `<p className="px-3 py-8 text-center text-muted">Loading…</p>`. Error: the message in `text-danger` with a "Try again" `text-link underline` button calling `refetch`, as `Prep.tsx` does.
   - Empty: `<p className="px-3 py-6 text-center text-muted">No recipes yet. Add a dish on the Plan tab.</p>`.
   - A search input at the top (`type="search"`, placeholder "Search recipes", input style from `features-common.md`, wrapped in `px-3`). Filter with a case-insensitive `includes` on `title`. If the filter matches nothing: "No recipe matches that."
   - A list in `px-3 space-y-3`. Each recipe is a card (`bg-card rounded-3xl shadow-card p-4`) whose header is a full-width `<button type="button" aria-expanded={open}>` showing the title (`font-bold text-ink`) and a line `text-[13px] text-muted`: `Made ${made}×` if `made > 0` else `Not made yet`, then ` · last ` plus `dayLabel(lastDate)` (from `./week`). Keep which card is open in `useState<string | null>(null)` (by `key`); tapping the open one closes it.
   - Open card body (`mt-3 space-y-2 text-sm`): servings (`${servings} serving(s)`), the ingredients as a `<ul>` using `formatGroceryItem` from `./grocery` on each, the notes if any (`text-muted`), and if `recipeUrl` is set a link `<a href={recipeUrl} target="_blank" rel="noopener noreferrer" className="text-link underline">Open recipe</a>`. If there are no ingredients, show "No ingredients saved." in `text-muted`.
6. **`Prep.tsx`:** import `RecipeList`. Widen the view state to `'plan' | 'menu' | 'grocery' | 'recipes'`. Add a fourth tab button after "Grocery list" in the segmented control, copying the other three exactly, labelled "Recipes". The shared "Loading…" line and the error block for week data must not show for `recipes` (the list handles its own): change `(view === 'menu' ? menu.isLoading : isLoading)` to `view !== 'recipes' && (…)`, and `view !== 'menu' && error && !isLoading` to `view !== 'menu' && view !== 'recipes' && error && !isLoading`. In the week-data section, add a first branch so that when `view === 'recipes'` it renders `<RecipeList />` instead of the week content (put it before the existing `view === 'menu' ? … : …` chain, e.g. `view === 'recipes' ? <RecipeList /> : view === 'menu' ? (…) : …`). Change nothing else in that file.

## Done means
- `npx tsc -b` and `npm test` pass (Claude runs them); the new tests pass.
- The other three tabs behave as before.
- Reply as in `features-common.md`.
