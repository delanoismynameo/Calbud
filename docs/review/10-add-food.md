# 10: "Add food" flow (search, pick a portion, log it)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app with Supabase and TanStack Query. The food search code already exists in `src/food/` (`searchFoods`, `scaleNutrition`, the `FoodResult` type). Your job is the screen where a user searches for a food, picks an amount, and logs it to a meal.

The Today screen's list and totals are a **later** task. Here you only add an **Add food** button to it.

### Read only these files
- This file.
- `src/food/types.ts`, `src/food/search.ts`, `src/food/nutrition.ts`: the existing food code. Don't change these.
- `src/household/useProfile.ts`, `src/auth/AuthProvider.tsx`, `src/lib/supabase.ts`, `src/lib/queryClient.ts`.
- `src/App.tsx`, `src/pages/Today.tsx`, `src/auth/AuthScreen.tsx` (for the form style).
- `supabase/migrations/20261027000001_tables.sql`: only the `foods` and `meal_logs` tables.

### What the database allows (already in place)
- **`foods`:** any member of the household can insert and update rows whose `household_id` is their household. There is a unique constraint on `(household_id, source, source_id)`.
- **`meal_logs`:** a user can insert rows where `user_id` is themselves.

### Create these files
Keep each under about 120 lines, and write **one file per write**.

**1. `src/lib/dates.ts`** (plus `src/lib/dates.test.ts`)
- **`localDateString(d: Date = new Date()): string`** returns `YYYY-MM-DD` built from the **local** date (`getFullYear`, `getMonth`, `getDate`), zero-padded. Never use `toISOString()`: that's UTC, and would put a late-evening snack on tomorrow.
- **`defaultMealType(d: Date = new Date())`** returns `'breakfast' | 'lunch' | 'dinner' | 'snack'` based on the local time:
  - before 10:30 → `breakfast`
  - before 15:00 → `lunch`
  - before 21:00 → `dinner`
  - otherwise → `snack`
- **Tests:**
  - `new Date(2026, 0, 5, 23, 30)` gives `2026-01-05`.
  - `new Date(2026, 11, 31, 0, 5)` gives `2026-12-31`.
  - Each meal-type boundary: 10:29 is breakfast and 10:30 is lunch; 14:59 is lunch and 15:00 is dinner; 20:59 is dinner and 21:00 is snack.

**2. `src/lib/useDebouncedValue.ts`**
`useDebouncedValue<T>(value: T, delayMs: number): T` returns `value` once it has stopped changing for `delayMs`. **Clear the timer on every change and on unmount.**

**3. `src/food/rows.ts`** (plus `src/food/rows.test.ts`). These are pure functions, with no Supabase calls.
- **`foodRow(food: FoodResult, householdId: string)`** returns the object to upsert into `foods`. Its keys are exactly the table's column names:
  - `household_id`, `source`, `source_id` (from `sourceId`), `name`, `brand`
  - `serving_g`, `serving_label`
  - `kcal_100g`, `protein_100g`, `carbs_100g`, `fat_100g`
  - `fiber_100g`, `sugar_100g`, `sodium_mg_100g`
- **`mealLogRow({ food, foodId, grams, mealType, loggedOn, userId })`** returns the object to insert into `meal_logs`:
  - `user_id`, `logged_on`, `meal_type`, `food_id`
  - `name`: `"<name> (<brand>)"` when there's a brand, otherwise just the name
  - `quantity_g`: the grams
  - `kcal`, `protein_g`, `carbs_g`, `fat_g`: from `scaleNutrition(food, grams)`
- **Tests:**
  - Every key of `foodRow` is one of the 14 column names above.
  - `mealLogRow` for 150 g of a 143 kcal / 12.6 g protein food gives `kcal: 215` and `protein_g: 18.9`.
  - The name includes the brand only when there is one.

**4. `src/food/logFood.ts`**
`logFood({ food, grams, mealType, loggedOn, userId, householdId }): Promise<void>` does two things:
1. Upserts the food with `supabase.from('foods').upsert(foodRow(...), { onConflict: 'household_id,source,source_id' }).select('id').single()`.
2. Inserts `mealLogRow(...)` with the returned id into `meal_logs`.

On any Supabase error, it throws `new Error(error.message)`.

**5. `src/food/useFoodSearch.ts`**
`useFoodSearch(query: string)` uses `useQuery`. **Rules:**
- **Debounce:** pass `query` through `useDebouncedValue` with **400 ms**, and use the trimmed, debounced value in the key: `queryKey: ['food-search', debounced]`.
- **Short queries:** `enabled` only when the debounced value has 2 or more characters.
- **Cancelling:** the `queryFn` receives `{ signal }` from TanStack Query, and **must** pass it to `searchFoods(debounced, { apiKey: usdaApiKey(), signal })`. That lets a newer search cancel an older one.
- **Caching and retries:** `staleTime: 5 * 60_000`, and `retry: false`, because the APIs are rate-limited.
- **No flicker:** `placeholderData: keepPreviousData`, so old results stay visible while a new search loads.
- **Returns:** `{ results, errors, isSearching, failed, tooShort }`.
  - `results` is `data?.results ?? []`.
  - `errors` is `data?.errors ?? []`.
  - `isSearching` is `query.isFetching`.
  - `failed` is the error message when the query threw (both sources failed), otherwise `null`.
  - `tooShort` is true while the trimmed **live** (not debounced) query is under 2 characters.

**6. `src/food/ServingPicker.tsx`**
Props: `food: FoodResult` and `onDone: () => void`.
- **Units:** `g`, plus `serving` when `food.servingG` is set.
- **Starting values:** 1 serving if there is one, otherwise 100 g.
- **The amount** is a text-state number input (`inputMode="decimal"`). Grams are calculated, never stored: `unit === 'g' ? amount : amount * food.servingG`.
- **Valid amount:** grams is a finite number greater than 0 and at most 5000. When it isn't, show `Enter an amount between 0 and 5000 g.` and **disable Log**.
- **Live numbers:** show `kcal`, `protein_g`, `carbs_g` and `fat_g` from `scaleNutrition`, updating as the amount changes. When a serving is chosen, also show the label (e.g. `1 banana (126 g)`).
- **Meal choice:** four buttons (Breakfast, Lunch, Dinner, Snack), starting at `defaultMealType()`. Each has `aria-pressed`.
- **Log:** uses `useMutation` with `logFood`:
  - `userId` comes from `useAuth().session.user.id`.
  - `householdId` comes from `useProfile().profile.household_id`.
  - `loggedOn` is `localDateString()`, read **when Log is pressed**, not when the screen opened.
  - While it runs, the button is disabled and says `Logging…`.
  - **On success:** call `queryClient.invalidateQueries({ queryKey: ['meal-logs'] })`, then `onDone()`.
  - **On error:** show the message in red. Stay on the screen and keep the values.
- **Cancel:** a text button that calls `onDone()` without logging.

**7. `src/pages/AddFood.tsx`**
The route component, for route `/add`.
- **Header:** a `← Back` link to `/`, and the title `Add food`.
- **The search input:** `type="search"`, `autoFocus`, placeholder `Search foods (e.g. banana, oatmeal)`.
- **Status messages:**
  - while `tooShort`: `Type at least 2 letters.`
  - while `isSearching`: a small `Searching…`
  - when `failed`: that message in red, with `Try again`, which calls `refetch` (expose `refetch` from the hook too)
  - each string in `errors`, in small grey text, e.g. `Open Food Facts search failed (HTTP 503)`. The other source's results still show.
- **The results list:**
  - Each result is a button showing the name, the brand (in grey, if any), `<kcal100g> kcal / 100 g`, and a small source tag: `USDA` or `OFF`.
  - When the search has finished with no results: `No foods found.`
- **Picking a food:** tapping a result shows `<ServingPicker food={…} onDone={…} />` in place of the list. Picker `onDone` after logging navigates to `/`. Cancel returns to the list, keeping the query and the results.

### Change these files
- **`src/App.tsx`:** add `<Route path="/add" element={<AddFood />} />`. Don't add a tab for it.
- **`src/pages/Today.tsx`:** keep the title, replace the placeholder text with a full-width blue `Add food` link to `/add`, and keep everything else.

### Style
Match `AuthScreen.tsx`: `bg-slate-800` cards, labels in `text-gray-400`, inputs and buttons at least 44px tall, a blue primary button, and errors in `text-red-400`. It must work at phone width (375px) with no sideways scrolling.

### Rules
- TypeScript only, with no `any`. **No new dependencies.**
- **Never call the real APIs or Supabase from tests.** The tests here are pure-function tests only.
- Write one file per write. Change existing files with small `edit`s.
- Don't change files not listed here. Don't run git commands. Don't create `.env` files.

### Done when
1. `npm test` passes, including the new `dates` and `rows` tests.
2. `npm run build` passes with no TypeScript errors.
3. `npm run test:db` still prints `31 passed, 0 failed`.
4. You have re-read this brief section by section.

Reply with: the files created and changed, the test count, the build result, and anything you were unsure about. **Report only what you actually did and saw.** Don't describe the brief from memory.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access (enabled by the user), web UI.
- **Wall time:** **6 min 26 s**, 37 steps, 1.2M tokens. It reached 29% of its context, with no compactions.
- **Outcome:** reported 43 tests passing, a clean build and 31/31 on the database tests, all of which I confirmed.
- **Saved:** harness output committed unchanged as `a5110ce`.

## Result
**The data layer was right:**
- `dates.ts` uses local getters, and its boundary tests pass.
- `rows.ts` uses exactly the 14 `foods` columns, and 150 g gives 215 kcal.
- `logFood` upserts on `household_id,source,source_id`, then inserts the meal log.
- `useFoodSearch` has a 400 ms debounce, passes `signal` from TanStack Query, and uses `retry: false` and `keepPreviousData`.
- `useDebouncedValue` clears its timer on every change.

**The screens had real bugs:**
1. **The Log button had no `onClick`.** `handleLog` was written but never attached, so **nothing could ever be logged**. The build and tests can't see this.
2. **Today's "Add food" was a plain `<a href="/add">`.** With HashRouter, that goes to `github.io/add`, a 404, instead of `#/add`.
3. **One `onDone` was used for both finishing and cancelling,** so after logging the user went back to the search list instead of Today. **This was partly my brief's fault:** it described two outcomes for one callback.
4. **The picked food was stored as an index into `results`.** A background refetch (for example on window focus) could swap it for a different food before logging.
5. **"No foods found." showed at the wrong times:** together with "Type at least 2 letters." and while a search was still loading.
6. **Smaller issues:**
   - The serving text doubled up ("1 1 banana (126 g) (126 g)").
   - The nutrition labels showed code names (`protein_g`).
   - Switching to grams kept "1", meaning 1 g.
   - The amount input had no label, and the unit buttons had no `aria-pressed`.
   - A 0 kcal food hid its numbers.
   - A `useCallback` had wrong dependencies.

## What I changed
- **`ServingPicker.tsx`, rewritten:**
  - Separate `onLogged` and `onCancel` props.
  - Log calls the mutation, and invalidation is awaited before leaving.
  - The unit switch keeps the same amount of food, converting servings and grams.
  - Labelled amount input, readable nutrition labels, and the serving line reads `1 × 1 banana split (490 g) = 490 g`.
  - `aria-pressed` on the toggles, and `type="button"` everywhere.
- **`AddFood.tsx`, rewritten:**
  - Stores the picked `FoodResult` itself.
  - Navigates to `/` after logging; Cancel keeps the query and the results.
  - Keys use `source:sourceId`, so a USDA and an OFF id can't collide.
  - Uses the app's normal layout instead of a second full-screen header.
- **`useFoodSearch.ts`:** added `settled` (the current query has finished loading), used for "No foods found.".
- **`Today.tsx`:** `<Link to="/add">`.

### Checked in the browser
Searches went to the **real** food APIs, using the user's USDA key. Saves went to the mock Supabase from task 07, extended to record `foods` upserts and `meal_logs` inserts:
- **Today → Add food** goes to `#/add`.
- **Typing "b"** shows "Type at least 2 letters."
- **Finishing "banana"** gives a list of real USDA foods.
- **Picking "Banana split"** defaults to 1 serving (490 g).
- **Switching to Grams** gives **490**. Setting 150 g shows **299 kcal**, 3.6 g protein, 48.9 g carbs and 10.3 g fat.
- **Choosing Breakfast and pressing Log** returns to Today. The mock then holds:
  - **one `foods` row**, with the right 14 columns and household `h-alice`
  - **one `meal_logs` row:** 150 g at breakfast for Alice, linked to that food, with the nutrition copied in and `logged_on: 2026-10-27`

  The local date was the 27th while UTC was already the 28th, so this confirms late-night logging lands on the right day.

### Found while testing: Open Food Facts text search is blocked in browsers
Every search showed a grey `Failed to fetch` line. The console showed **CORS**:
- **`search.openfoodfacts.org` sends no `Access-Control-Allow-Origin` header,** for GET or POST, from either `localhost` or `delanoismynameo.github.io`.
- **The old `cgi/search.pl` and `/api/v2/search` endpoints return 503.**
- **The barcode lookup (`/api/v2/product/…`) does send `Access-Control-Allow-Origin: *`,** so barcode scanning will still work.

Task 09's tests couldn't catch this, because CORS only exists in browsers, and nor could my checks with scripts. **The app's search needs a decision** (see the verdict below).

## How I would have done it
- **Two callbacks from the start** (`onLogged`, `onCancel`), and store the picked object rather than its position. I should have written both into the brief.
- **A one-line "click it" check** in the brief: "after building, confirm by reading the JSX that every button has an `onClick` or is a `type="submit"` in a form". UI bugs like a disconnected button are exactly what the 35B leaves behind.
- **Before adopting any third-party API for a browser app, test it from a browser origin, not from a script.**

## Verdict
**Usable after real fixes. The data code was right; the screens weren't wired up.** Lessons:
1. **The 35B's pattern holds across tasks 06, 07 and 10:** solid pure functions and data code, but the React wiring is wrong in ways the build can't catch. Every UI task needs a click-through.
2. **APIs need checking from where they'll actually be called.** Open Food Facts search works from scripts and is blocked from browsers.
3. **Decision needed:** either drop Open Food Facts from text search and use USDA's Branded foods for packaged items, keeping Open Food Facts for barcodes; or put a small proxy in front of it (a Supabase Edge Function).
