# 83: Open Food Facts in the food text search

## Prompt
A short plain prompt typed in the chat box, with no mention of the code map (AGENTS.md, map included, is now loaded into every session automatically). It asked for four things:
1. An `off-search` Edge Function for signed-in users only. It gave the OFF search address, the US and brand filters and the fields, all checked live beforehand.
2. OFF results joining USDA's in `searchFoods`, read with `normalizeOffProduct`.
3. The serving size looked up by barcode when an OFF result is picked.
4. The credit line "Food data from USDA and Open Food Facts".

It also said not to deploy, and to add tests and run tsc and vitest.

## Run
Laguna XS 2.1 at **High**, web UI, Full access. 31 min, 126 steps, ~45 tok/s, 8.9M tokens. Raw output is in the commit "Task 83 (harness, …)".

- **It used the map:** it went straight to the right files (the existing function, `search.ts`, `off.ts`, `usda.ts`, `brand.ts`, `useFoodSearch.ts`, `FoodFinder.tsx`, `RecipeBuilder.tsx` and their tests), with no wandering. Its first step was still a glob of every `.ts` file. Compare task 82, which wandered.
- **Its report was accurate about the checks** (tsc clean, 670 tests).
- **About a third of the run went on its own test file:** it corrupted it and then rewrote it.

## What was wrong
- **The app never sent the sign-in token,** so the function would always have answered 401.
- **The function had no CORS** (no OPTIONS reply and no `Access-Control-*` headers), so browsers would have blocked every answer. It copied the meal-reminder function, which is only called by cron, never by a browser.
- **The filters were sent as separate URL parameters** (`countries_tags=…`, `brands_tags=…`). OFF ignores those, so the searches were unfiltered and worldwide. Checked live: 10,000 hits, against 17 Kirkland bars with the filters inside `q`, which is what the prompt said.
- **OFF results never showed in plain searches.** Equal matches keep arrival order, OFF arrived last, and the list stops at 30. For "chobani greek yogurt", none of the 30 were from OFF.
- **Smaller problems:**
  - The brand was turned into a tag twice (in the app and in the function).
  - An OFF failure was labelled "Packaged foods".
  - The credit showed even with no results.
  - There was no feedback while the serving was being looked up.
  - A bad request body crashed the function.
  - The function used the service-role key just to check a token.

## What I changed
- **`supabase/functions/off-search/index.ts`, rewritten:**
  - Adds CORS and an OPTIONS reply.
  - Checks the sign-in with the anon key.
  - Builds the search text with the filters inside `q`. Quotes and colons are dropped from the words, so a search can't add filters of its own.
  - Times out after 8 s.
  - Returns only `hits`.
  - Answers 400, 401, 405 or 502 with a JSON error.
- **`off.ts`:** `searchOff` sends the token and the brand as typed, and finds nothing without a token. `offBrandTag` is gone, because the function makes the tag.
- **`search.ts`:** one `merged` helper runs every source at once. In plain searches, basic foods come first, then USDA packaged foods and OFF take turns, one food each. Errors are labelled by source, and it throws only when every source failed.
- **`useFoodSearch.ts`:** passes the session's access token.
- **`FoodFinder.tsx`:**
  - The credit shows only with results.
  - "Getting the serving size…" shows while an OFF pick is looked up.
  - Kept the model's pick-then-`lookupBarcode` flow.
- **Tests:** rewrote the OFF search tests and the four broken search tests, and added tests for no token (USDA only), an OFF failure (USDA still shows, with a note) and taking turns. 667 tests pass.
- **`scripts/dev/mock-supabase.mjs`:** gained an `off-search` route that builds the same search text and asks the real OFF.

## Mock click-through
Phone size, against the mock (which asks the real OFF).
- **Brand search:** Kirkland Signature + "protein bar" showed Kirkland bars from both sources, and the credit (linking to world.openfoodfacts.org) sat under the results.
- **Picking an OFF bar:** it looked up the serving (1 serving, 60 g, 170 cal) and showed the full label. Logging saved a `source: off` food with `serving_g` 60 and its photo, then returned to Today.
- **Plain search, "chobani greek yogurt":** after the turn-taking fix, 5 OFF results with package photos showed after USDA's basic Chobani entries.

## Not done
- **The function is not deployed.** That needs the user's go-ahead. Deploy it with `verify_jwt` on (the default).
- **Live searches would come from Supabase's servers**, not this computer. OFF hasn't rate-limited 12 searches in a row from here.

## Lesson
The auto-loaded map worked: the model found the right files straight away. Its gaps were things no map shows: how the browser and the server function talk to each other (CORS, the token) and how OFF reads its filters. It also dropped a detail the prompt spelled out (the filters inside `q`). Next time, check given API details against the diff first.
