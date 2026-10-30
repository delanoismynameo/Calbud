# 71: Shared grocery list, part 2: use the shared data

Read `docs/review/features-common.md` first and follow it. Task 70 already added `src/prep/groceryApi.ts`, `src/prep/useGrocery.ts` (hooks) and `src/prep/useGroceryRealtime.ts`; read `useGrocery.ts` first.

## What and why
`GroceryList.tsx` and `RecipeList.tsx` still keep hand-added items and ticks in `localStorage`. Switch them to the shared hooks so both partners see the same list and the same ticks. Look and behaviour stay the same.

## Files
`src/prep/GroceryList.tsx`, `src/prep/RecipeList.tsx`, `src/prep/extras.ts`

## Steps
1. **`GroceryList.tsx`:**
   - Remove `loadTicks`, `saveTicks`, and the `useEffect` that re-reads them; remove the `ticked` and `extras` `useState`s and the `setExtras`/`saveExtras` calls. Remove the imports of `loadExtras` and `saveExtras`, and `useEffect` if it is no longer used.
   - Add `const extrasQuery = useGroceryExtras(weekStart)`, `const ticksQuery = useGroceryTicks(weekStart)`, `const addExtras = useAddGroceryExtras(weekStart)`, `const removeExtraMutation = useRemoveGroceryExtra(weekStart)`, `const toggleTick = useToggleGroceryTick(weekStart)`, `const setTicks = useSetGroceryTicks(weekStart)`, `const clearTicks = useClearGroceryTicks(weekStart)`. Then `const extras = extrasQuery.data ?? []` and `const ticked = new Set(ticksQuery.data ?? [])`.
   - The checkboxes' `onChange` calls `toggleTick.mutate({ key, ticked: !isTicked })`. The old `toggle` callback and `clear` callback go away.
   - The Add form's submit handler: after `parseIngredients`, call `addExtras.mutate([...parsed])` and clear the input (do not call `setExtras`/`saveExtras`).
   - The remove (✕) button calls `removeExtraMutation.mutate(key)`.
   - "Clear ticks" (shown when `ticked.size > 0`) calls `clearTicks.mutate()`.
   - The "Yes, clear" button in the send dialog calls `setTicks.mutate(allItems.map(item => groceryKey(item)))` and then `setSendState('idle')`.
   - Show an error line when any of `addExtras`, `removeExtraMutation`, `toggleTick`, `setTicks`, `clearTicks` has `isError`: `<p className="text-danger text-xs mt-1">{message}</p>` with that mutation's `error.message` (one line is enough: use the first one that errored).
   - If `extrasQuery.isLoading || ticksQuery.isLoading`, the list shows as before using the empty arrays; no spinner is needed.
   - Keep the `weekStart` prop, the Send to Keep flow, the layout and every visible string.
2. **`RecipeList.tsx`:** remove the `loadExtras`, `saveExtras` and `mergeExtras` imports; add `const addExtras = useAddGroceryExtras(weekStart)` at the top of the component. The "Add to grocery list" button's `onClick` calls `addExtras.mutate(r.ingredients, { onSuccess: () => setAddedKey(r.key) })`. Disable it while `addExtras.isPending` as well as when `addedKey === r.key`. Under the button show the error (`text-danger text-xs`) when `addExtras.isError`. Remove the `GroceryItem` import if it is no longer used (an `Ingredient[]` is already the same shape).
3. **`extras.ts`:** delete the functions `loadExtras` and `saveExtras` and the `isValid` helper (keep `mergeExtras` and `removeExtra`). Delete the `// Replaced by …` comments if there are any.

## Done means
- No file under `src` mentions `localStorage` for the grocery list any more (`grep -rn "grocery" src | grep localStorage` finds nothing).
- `npx tsc -b` and `npm test` pass (Claude runs them).
- Reply as in `features-common.md`.
