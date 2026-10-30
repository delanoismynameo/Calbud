# 69: Add things to the grocery list

Read `docs/review/features-common.md` first and follow it.

## What and why
The grocery list only shows ingredients of this week's planned prep sessions. Add two ways to put things on it: an "Add item" box on the list itself (for things like milk), and an "Add to grocery list" button on a recipe on the new Recipes tab. Added items are kept on this phone for that week, the same way ticks already are (`localStorage`).

## Files
- New: `src/prep/extras.ts`, `src/prep/extras.test.ts`
- Edit: `src/prep/GroceryList.tsx`, `src/prep/RecipeList.tsx`, `src/pages/Prep.tsx` (only the `<RecipeList />` call)

## Steps
1. **`extras.ts`** (no React). Import `GroceryItem`, `groceryList`, `groceryKey` from `./grocery`. Export:
   - `mergeExtras(existing: GroceryItem[], added: GroceryItem[]): GroceryItem[]` = `groceryList([existing, added])`.
   - `removeExtra(existing: GroceryItem[], key: string): GroceryItem[]` = `existing.filter(i => groceryKey(i) !== key)`.
   - `loadExtras(weekStart: string): GroceryItem[]` reads `localStorage.getItem('calbud:grocery-extra:' + weekStart)`, parses JSON, returns `[]` on a missing key, bad JSON or anything that is not an array of objects with a string `name`, a number-or-null `qty` and a string `unit`. Wrap in try/catch.
   - `saveExtras(weekStart: string, items: GroceryItem[]): void` writes the same key as JSON, in try/catch that ignores failure (as `saveTicks` in `GroceryList.tsx` does).
2. **`extras.test.ts`:** tests for `mergeExtras` (adds up the same item, keeps different ones, sorted by name) and `removeExtra` (removes by key, leaves the rest). Do not test `loadExtras` or `saveExtras` (they need `localStorage`).
3. **`GroceryList.tsx`:**
   - Add state `extras` initialised with `loadExtras(weekStart)` and refreshed in the existing `useEffect` that runs when `weekStart` changes.
   - Add an "Add item" form at the top of the list area, shown always (also when there are no planned ingredients): a row `flex gap-2` with a text input (placeholder "Add an item, e.g. 2 lb chicken", input style from `features-common.md`, `aria-label="Add item"`) and a primary-style "Add" button (`px-5`). On submit (use a `<form onSubmit>` so Enter works): `parseIngredients(text)` from `./ingredients`; if it gives nothing, do nothing; otherwise `const next = mergeExtras(extras, [...parsed])`, `setExtras(next)`, `saveExtras(weekStart, next)`, clear the input.
   - Compute `const allItems = groceryList([...plannedLists, extras])` where `plannedLists` are the lists already passed to `groceryList` today. Use `allItems` (not `items`) for `groceryText(...)` and for the "Yes, clear" keys, so "Send to Keep" includes what was added by hand. Keep `items` (planned only) for the main list display.
   - Below the main list, when `extras.length > 0`, show a section titled "Added by hand" (`text-[13px] font-bold uppercase tracking-[1.5px] text-section mt-4 mb-2`) with the same card and checkbox rows as the main list, built from `extras`, using the same `ticked` set and `toggle`. Add a small remove button at the right of each row: `<button type="button" aria-label={'Remove ' + item.name} onClick={...} className="text-muted px-2 py-1">✕</button>` that calls `removeExtra`, then `setExtras` and `saveExtras`.
   - The "No ingredients in this week's planned sessions." message and the Send button logic must keep working: show the empty message only when both `items` and `extras` are empty, and show the Send button when `groceryText(allItems, ticked) !== ''`.
   - The "From N planned sessions" line stays.
4. **`RecipeList.tsx`:** add a prop `weekStart: string`. In an open recipe card, below the ingredients, when the recipe has at least one ingredient, add a secondary-style button `Add to grocery list`. On click: `saveExtras(weekStart, mergeExtras(loadExtras(weekStart), recipe.ingredients))` then set local state `addedKey` to the recipe `key`; while `addedKey === recipe.key` the button reads `Added to this week's list` and is disabled. Reset `addedKey` to null when a different card is opened.
5. **`Prep.tsx`:** pass `weekStart={start}` to `<RecipeList />`.

## Done means
- `npx tsc -b` and `npm test` pass (Claude runs them); new tests pass.
- Ticking, "Clear ticks", and "Send to Keep" still work for the planned items.
- Reply as in `features-common.md`.
