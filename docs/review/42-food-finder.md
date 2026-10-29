# 42: Move Add food's search and barcode scan into a reusable `FoodFinder`

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for logging food. `src/pages/AddFood.tsx` lets you find a food in four ways: a search box, your favorites and recent foods, "Your foods", and a barcode scan. The next task needs the same finder inside a form, to pick ingredients. So this task **moves the finder into its own component, `src/food/FoodFinder.tsx`, without changing what Add food looks like or does.** It is a refactor: cut and paste, then connect.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Check your work by reading it. The reviewer runs the type check, `npm test` and `npm run build`, and clicks through Add food afterwards.

### Read only these files
- This file.
- `src/pages/AddFood.tsx` (all of it).

### 1. `src/food/FoodFinder.tsx` (new)
```tsx
export default function FoodFinder({ onPick, onCreate }: { onPick: (food: FoodResult) => void; onCreate?: () => void })
```
Move into it, **unchanged** except for the points below:
- **State and hooks:** `query`, `scanning`, `lookingUp`, `scanError` and `scanKey`, plus `useFoodSearch(query)`, `useRecentFoods()`, `useFavoriteFoods()` and `useHouseholdFoods()`.
- **Derived values and handlers:** `empty`, `yours`, `usdaResults`, `favoriteList`, `recentList`, `quickPick`, `onCode` and `onScannerCancel`.
- **The JSX:** everything that today sits in AddFood's `scanning ? (…) : (<>…</>)` branches, that is the scanner view and the search view. The component returns `scanning ? (scanner view) : (search view)`.
- **Changes:**
  1. Every `setSelected(food)` becomes `onPick(food)`, both in `quickPick` and in the search results list. In `onCode`, `setSelected(food)` becomes `onPick(food)`, and `setScanning(false)` stays.
  2. The **+ Create a food** button shows only when `onCreate` is given, and calls `onCreate()`. Its grid wrapper is `grid-cols-2` when `onCreate` is given, otherwise `grid-cols-1`.
  3. Keep `autoFocus` on the search box.
- Move the imports it needs from AddFood (`useFoodSearch`, `useRecentFoods`, `useFavoriteFoods`, `withoutFavorites`, `useHouseholdFoods`, `householdMatches`, `withoutHousehold`, `BarcodeScanner`, `normalizeBarcode`, `lookupBarcode`, `useState`, `useCallback`, and `import type { FoodResult }`). Use paths relative to `src/food/`.
- It has no early return, so the hook order stays fixed. Keep the existing `useCallback` calls as they are, but add no new `useMemo` or `useCallback`.

### 2. `src/pages/AddFood.tsx`
- Keep: `navigate`, `params`, `today`, `day`, `home`, `selected`, `creating`, the header row, and the `ServingPicker` and `CustomFoodForm` branches.
- Replace the scanner and search branches with one: `<FoodFinder onPick={setSelected} onCreate={() => setCreating(true)} />`. So the main JSX becomes `selected ? (<ServingPicker … />) : creating ? (<CustomFoodForm … />) : (<FoodFinder … />)`.
- Remove the state, hooks, handlers and imports that moved, and keep only what AddFood still uses.

### Rules
- **Files:** create only `src/food/FoodFinder.tsx`; change only `src/pages/AddFood.tsx`. **Never edit any file under `docs/`.**
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **No behaviour change:** every class name, text, condition and order in the moved JSX stays exactly as it was.

### Done when
1. `AddFood.tsx` renders `FoodFinder` as described, and nothing it no longer uses is left in it.
2. You have compared the moved JSX with the original line by line.

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.
