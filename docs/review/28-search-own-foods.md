# 28: Add food's search also finds the household's own foods

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Add food's search box only searches USDA. Foods the household already has are invisible to it: dishes like "Curry", custom foods, and anything logged before (all of these are `foods` rows of the household). They only show under Recent and Favorites, before you type.

Your job: while searching, show **Your foods** (the household's foods that match) above the USDA results.

### Already done (don't redo)
- **Ranking:** `words(text)` and `matchScore(food, query)` are in `src/food/rank.ts`.
- **Food helpers:**
  - `foodKey(food)` is `${source}:${sourceId}`, in `src/food/favorites.ts`
  - `foodResultFromRow(row)` and `FoodRowFromDb` are in `src/food/recents.ts`
- **Hook pattern:** `useFavoriteFoods()` in `src/food/useFavoriteFoods.ts` is the hook to copy.

### Read only these files
- This file.
- `src/food/rank.ts` and the first 25 lines of `src/food/rank.test.ts`, for the test style and its `food()` helper.
- `src/food/useFavoriteFoods.ts`, `src/food/favorites.ts`, `src/food/recents.ts`.
- `src/pages/AddFood.tsx`: the file you change.

### Write in this order. Run `npm test` after step 1 before you continue.

### 1. `src/food/householdFoods.ts` and `src/food/householdFoods.test.ts`
```ts
export function matchesQuery(food: FoodResult, query: string): boolean
export function householdMatches(foods: FoodResult[], query: string, limit = 8): FoodResult[]
export function withoutHousehold(results: FoodResult[], household: FoodResult[]): FoodResult[]
```
- **`matchesQuery`:**
  - `nameWords = words(food.name + ' ' + (food.brand ?? ''))`
  - true when `words(query)` isn't empty and **every** query word is a prefix (`startsWith`) of at least one name word
- **`householdMatches`:**
  - `[]` when `query.trim().length < 2`
  - otherwise the foods where `matchesQuery` is true, sorted by `matchScore(food, query)`, highest first; ties keep input order
  - then `.slice(0, limit)`
- **`withoutHousehold`:** `results` without any food whose `foodKey` is the same as one in `household`.

Tests, one `it` each. Copy the `food()` helper from `rank.test.ts`, with a third parameter `sourceId = '0'`:
1. `matchesQuery(food('Curry'), 'curry')` is true, `matchesQuery(food('Curry'), 'cur')` is true, and `matchesQuery(food('Curry'), 'pasta')` is false.
2. `matchesQuery(food('Chicken and Potatoes'), 'chicken potato')` is true, and `matchesQuery(food('Chicken and Potatoes'), 'chicken rice')` is false.
3. `matchesQuery(food('Greek yogurt', 'Fage'), 'fage')` is true.
4. `householdMatches([food('Curry')], 'c')` is `[]`.
5. `householdMatches([food('Curry'), food('Cur sauce')], 'cur').map(f => f.name)` is `['Cur sauce', 'Curry']`. "Cur sauce" has the whole word, so it scores higher.
6. With `soups = Array.from({ length: 10 }, (_, i) => food('Soup ' + (i + 1)))`, `householdMatches(soups, 'soup')` has length `8`, and its first name is `'Soup 1'`.
7. `withoutHousehold([food('A', null, '1'), food('B', null, '2')], [food('A', null, '1')]).map(f => f.name)` is `['B']`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 2. `src/food/useHouseholdFoods.ts`
`export function useHouseholdFoods()`, exactly like `useFavoriteFoods` but:
- `queryKey: ['household-foods', householdId]`
- without the `is_favorite` filter: all of the household's `foods`, `.order('name')`, mapped with `foodResultFromRow`

### 3. Change `src/pages/AddFood.tsx`
- **The data:**
  - `const household = useHouseholdFoods()`
  - `const yours = tooShort || empty ? [] : householdMatches(household.data ?? [], query)`
  - `const usdaResults = withoutHousehold(results, yours)`
  - put all of this with the other hooks at the top
- **The Your foods section:** when `yours.length > 0`, render it right **after** the "Scan a barcode / + Create a food" buttons and **before** the "Searching…" line:
  - a heading `Your foods`, styled like the `Favorites` heading
  - then `yours.map(quickPick)`
  - this section doesn't wait for USDA: it shows as soon as the household foods are loaded
- **USDA results:** use `usdaResults` instead of `results` in the USDA results list, both in its `length > 0` check and in its `.map`.
- **The empty message:** `No foods found.` shows only when `settled && !failed && usdaResults.length === 0 && yours.length === 0`.
- Everything else stays as it is: Favorites and Recent when the box is empty, the errors, and the scanner.

### Rules
- **Files:**
  - create only `src/food/householdFoods.ts`, `src/food/householdFoods.test.ts` and `src/food/useHouseholdFoods.ts`
  - change only `src/pages/AddFood.tsx`
- **Don't:** run git commands, create `.env` files, or add packages.
- **Writing:** write each new file in one write, then fix with small `edit`s. Keep JSX ternaries shallow.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 7. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Copy the last 5 lines it prints** from the terminal output; don't retype them.
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, in the same session as task 27 (see that note).
- **Outcome:** finished. At one point its `edit` dropped the Favorites/Recent block, but it noticed and put it back.

## Result
- **Tests:** 7 new, all passing (224 in total).
- **Click-through** at 375 px against the mock:
  - typing `cur` shows **Your foods → Curry (149 kcal / 100 g)** above the USDA results
  - `oat` lists the household's "Oatmeal, cooked" once
  - nonsense (`zzqx`) still shows "No foods found."

## What I changed
Nothing.

## Verdict
Usable as delivered.
