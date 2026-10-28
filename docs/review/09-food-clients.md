# 09: Food lookup clients (USDA + Open Food Facts) and macro scaling

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript app. Your job is the **food data layer**:
- clients for two free nutrition APIs
- code that turns their responses into one common shape
- a merged search
- the maths that scales nutrition to a serving size

All of it comes with unit tests. **No UI in this task.** The search box comes later.

### Read only these files
- This file.
- `package.json`, `tsconfig.json`, `src/vite-env.d.ts`, `.env.example`, `.github/workflows/deploy.yml`.
- `supabase/migrations/20261027000001_tables.sql`: only the `foods` table, whose columns the common shape matches.

### Install
`npm install --save-dev --save-exact vitest`. Add the script `"test": "vitest run"` to `package.json`.

### Step 1: read the real sample responses (fixtures)
Real API responses are **already saved** in `src/food/__fixtures__/`. Read every one of them before writing any parser.

| File | What it is |
|---|---|
| `usda-search-egg.json`, `usda-search-banana.json` | USDA search results (`foods` array) |
| `off-search-oatmeal.json` | Open Food Facts search results. Note: the products are in **`hits`**, and `brands` is an **array**. |
| `off-product-nutella.json` | Open Food Facts barcode lookup (`status: 1`, `product`). Here `brands` is a **string**. |
| `off-product-not-found.json` | Barcode lookup for an unknown code. The API sends this body with **HTTP 404**. |

**Never download, edit, regenerate or invent fixture files**, and never call the real network (no `curl`, no `fetch` to real URLs). For a test that needs a variation (e.g. a missing nutrient), copy an item from a fixture *inside the test* and change the copy.

**If something this brief needs is missing, or a fixture disagrees with the brief: follow the fixture and say so in your reply.** If you can't continue, stop and say what is missing. Never fill a gap with made-up data.

### Step 2: the code
Put everything in `src/food/`. Keep each file under about 120 lines, and write **one file per write**.

**`types.ts`**
```ts
export type FoodSource = 'usda' | 'off'
export interface FoodResult {
  source: FoodSource
  sourceId: string          // USDA fdcId as a string, or the OFF barcode
  name: string
  brand: string | null
  servingG: number | null   // default serving in grams, if known
  servingLabel: string | null
  kcal100g: number
  protein100g: number
  carbs100g: number
  fat100g: number
  fiber100g: number | null
  sugar100g: number | null
  sodiumMg100g: number | null
  barcode: string | null    // OFF code; null for USDA generic foods
}
```

**`nutrition.ts`**
`scaleNutrition(food: FoodResult, grams: number)` returns `{ kcal, protein_g, carbs_g, fat_g }`. Rules:
- Each value is `per100g * grams / 100`.
- `kcal` is rounded to a whole number. The three macros are rounded to 1 decimal place.
- It throws `RangeError('grams must be a positive number')` when `grams` is not a finite number greater than 0.

**`usda.ts`**
- **`normalizeUsdaFood(raw: unknown): FoodResult | null`** maps one item from the `foods` array.
  - **Nutrients** are matched by `nutrientId`:
    - **energy:** use `1008` (kcal). If that's missing, use `2047`, then `2048`.
    - **protein** `1003`, **fat** `1004`, **carbs** `1005`, **fiber** `1079`, **sugar** `2000`, **sodium** `1093` (already in mg).
  - **Return `null`** if energy, protein, carbs or fat is missing, or if there is no name.
  - **Default serving:**
    - If `servingSize` is set and `servingSizeUnit` is `g` or `GRM` (any case), use it, with a label like `1 serving (40 g)`.
    - Otherwise use the `foodMeasures` entry with the **lowest `rank`** among those with `gramWeight > 0`, labelled with its `disseminationText`. The list isn't sorted: for "Banana, raw" in the fixture, this gives `1 banana` (126 g), not `1 cup, mashed`. Add a test for exactly that.
    - Otherwise both are `null`.
  - Use `description` as the name and `brandOwner` (or `null`) as the brand.
- **`searchUsda(query, { apiKey, fetchFn = fetch, signal })`** returns `Promise<FoodResult[]>`.
  - It sends a **POST** to `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=<key>`, with header `Content-Type: application/json` and this JSON body: `{ "query": <query>, "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"], "pageSize": 25 }`. It searches generic foods only; Open Food Facts covers packaged foods.
  - Use POST, not GET: the GET form rejects these data-type names.
  - It maps results through `normalizeUsdaFood` and drops the `null`s.
  - On a non-OK response it throws `Error('USDA search failed (HTTP <status>)')`. **The error must never include the API key.**

**`off.ts`**
- **`normalizeOffProduct(raw: unknown): FoodResult | null`** reads `product_name` (the name), `code`, `nutriments` and `brands`. **Brand rule:**
  - If `brands` is an array, use its first element.
  - If it's a string, use the part before the first comma.
  - In both cases, trim it. An empty result becomes `null`.

  The nutriments are read like this:
  - **Energy:** `energy-kcal_100g`. If that's missing, use `energy-kj_100g / 4.184`, rounded to 1 decimal place.
  - **Protein, carbs, fat:** `proteins_100g`, `carbohydrates_100g`, `fat_100g`.
  - **Fibre and sugar:** `fiber_100g` and `sugars_100g`, or `null` when missing.
  - **Sodium:** `sodium_100g` is in **grams**, so multiply by 1000 for mg (`null` if missing).
  - **Serving:** `serving_quantity` when it's a positive number, labelled with `serving_size`.
  - **Return `null`** if there is no name, or energy, protein, carbs or fat is missing.
  - `sourceId` and `barcode` are both the `code`.
- **`searchOff(query, { fetchFn = fetch, signal })`** sends a GET to `https://search.openfoodfacts.org/search?q=<query, URL-encoded>&page_size=20&fields=code,product_name,brands,serving_size,serving_quantity,nutriments`. It maps **`hits`** through `normalizeOffProduct`. On a non-OK response it throws `Error('Open Food Facts search failed (HTTP <status>)')`.
- **`lookupBarcode(code, { fetchFn = fetch, signal })`** returns `Promise<FoodResult | null>`.
  - It sends a GET to `https://world.openfoodfacts.org/api/v2/product/<code>.json?fields=code,product_name,brands,serving_size,serving_quantity,nutriments`.
  - It **parses the JSON body before checking the HTTP status**. If the body has `status: 0`, it returns `null`, even when the HTTP status is 404 (see `off-product-not-found.json`).
  - It also returns `null` when the product doesn't normalise.
  - Any other non-OK response throws `Error('Open Food Facts lookup failed (HTTP <status>)')`.

**`search.ts`**
`searchFoods(query, { apiKey, fetchFn = fetch, signal })` returns `Promise<{ results: FoodResult[]; errors: string[] }>`:
1. Trim the query. If it is shorter than 2 characters, return `{ results: [], errors: [] }` **without fetching**.
2. Run `searchUsda` and `searchOff` together with `Promise.allSettled`.
3. Results are the USDA results first, then the Open Food Facts results, with duplicates removed. An item is a duplicate when its `name` and `brand`, lower-cased and trimmed, match an earlier item.
4. Cap the results at 25.
5. If one source fails, return the other's results, with that failure's message in `errors`. **If both fail, throw** an `Error` whose message joins both.

**`env.ts` (in `src/lib/`, already exists):** don't change it. Instead, in `search.ts`, export `usdaApiKey()`, which returns `import.meta.env.VITE_USDA_API_KEY` if it's non-empty, or `'DEMO_KEY'` otherwise.

### Step 3: tests (vitest)
Use one test file next to each module: `nutrition.test.ts`, `usda.test.ts`, `off.test.ts`, `search.test.ts`.
- Read fixtures with `readFileSync(new URL('./__fixtures__/<file>', import.meta.url), 'utf8')`.
- **Never call the real network in tests.** Pass a fake `fetchFn` that returns `new Response(JSON.stringify(fixture), { status })` and records the URL and the `init` (method and body) it was called with.

Include at least these tests (more is fine):
- **nutrition**
  - 150 g of a food with 143 kcal / 12.6 g protein per 100 g gives 215 kcal and 18.9 g protein.
  - Rounding works for kcal and the macros.
  - 0, a negative number and `NaN` each throw `RangeError`.
- **usda**
  - Every egg fixture item normalises to a `FoodResult` with `source: 'usda'` and a numeric `kcal100g`.
  - The banana fixture normalises too.
  - Energy fallback: take a copy of a fixture item, remove any `1008` entry, and make sure a `2047` entry exists (add one with a known value if the item has none). The result uses that `2047` value.
  - An item with protein removed returns `null`.
  - `searchUsda` sends a POST whose JSON body has the query, `pageSize: 25` and the three data types, and whose URL has the key.
  - On a 403, `searchUsda` throws, and the message doesn't contain the key.
- **off**
  - `searchOff` on the oatmeal fixture returns the hits that have energy and macros. The first hit (`cookies`, no energy) is dropped.
  - The brand is taken from a `brands` array (e.g. `Pepperidge Farm`) and from a `brands` string (`Nutella, Ferrero` becomes `Nutella`).
  - Sodium is converted from g to mg. For Nutella, `0.0428` g becomes `42.8` mg (compare with `toBeCloseTo`).
  - The kJ fallback works on a copy of a hit with `energy-kcal_100g` removed but `energy-kj_100g` kept.
  - `lookupBarcode` on the Nutella fixture returns a result whose `barcode` is `3017620422003`.
  - `lookupBarcode` returns `null` when the not-found fixture is served with **HTTP 404**.
  - It throws on an HTTP 500 with a non-JSON body.
- **search**
  - A 1-character query makes no fetch.
  - Duplicates (same name and brand, different case) are removed.
  - USDA failing still returns the Open Food Facts results, with one error.
  - Both failing throws.
  - Results are capped at 25.

### Also change
- **`src/vite-env.d.ts`:** add `readonly VITE_USDA_API_KEY: string` to `ImportMetaEnv`.
- **`.env.example`:** add `VITE_USDA_API_KEY=`, with a comment saying the key is free from api.data.gov and that `DEMO_KEY` is used when it's empty.
- **`.github/workflows/deploy.yml`:** in the Build step's `env:`, add `VITE_USDA_API_KEY: ${{ vars.VITE_USDA_API_KEY }}`.

### Rules
- TypeScript, with no `any`. Treat API JSON as `unknown` and narrow it with small type guards or `typeof` checks.
- Don't change any file not listed above. Don't run any git commands.
- Don't create `.env` or `.env.local`.

### Done when
1. `npm test` passes, and its output lists all the tests above.
2. `npm run build` passes with no TypeScript errors. Test files are under `src`, so they get type-checked too.
3. `npm run test:db` still prints `31 passed, 0 failed`.
4. You have re-read this brief section by section.

Reply with:
- the files created
- the test count
- the build result
- every place where a fixture disagreed with this brief, and what you did about it
- anything you were unsure about

## Run
Two runs on `qwen3.6:35b-a3b-128k` at **High**, with Full access (enabled by the user), on the web UI.

| | Run 1 (original brief) | Run 2 (fixed brief, real fixtures provided) |
|---|---|---|
| Wall time | 23 min 46 s, 114 steps, 7.5M tokens | 12 min 9 s, then 18 s and 3 min 46 s (see below), 5M tokens in total |
| Fixtures | **Invented** by the model after its live requests failed | The real ones I saved; it left them untouched |
| Tests | 27 passing, but against made-up data | 27 passing, against real data |
| Saved as | branch `task09-35b`, `99fb5fa`, **not merged** | `e634792` on main |

**Run 2 needed two nudges from the user.** It stopped after type-checking without running the tests. The user asked "did you complete everything?", it listed what was left, and after "yeah" it finished.

## Result
### Run 1: why it failed, and whose fault
Two of the brief's URLs were wrong, which is my mistake:
- **USDA:** the GET form with `dataType=Foundation,SR Legacy,Survey (FNDDS)` returns **HTTP 400**.
- **Open Food Facts:** the old `cgi/search.pl` endpoint returns **503**. Search has moved to `search.openfoodfacts.org`, which returns `hits` (not `products`), with `brands` as an array.

The model's retries then used up the shared `DEMO_KEY` rate limit. Instead of stopping, it **wrote "realistic" fixtures from memory**, built parsers and tests around them, and reported success. Its "fixture disagreements" section quoted things the brief never said. Checked against real responses, its Open Food Facts search parser returned **nothing**.

### Fixes before run 2
- **I saved the real fixtures myself** with `scripts/save-food-fixtures.mjs`. USDA used the user's key from `.env.local`, which is never printed and doesn't appear in any fixture.
- **The brief was corrected:**
  - USDA search uses **POST** with a JSON `dataType` array.
  - Open Food Facts uses the new search service.
  - An unknown barcode comes back as HTTP 404 with `status: 0`.
  - The USDA default serving is the **lowest-rank** `foodMeasures` entry. For "Banana, raw" that's `1 banana`, not `1 cup, mashed`.
  - A new rule: never download or invent fixtures, and stop and report anything missing.

### Run 2
The parsers handle the real data correctly: `hits`, both brand forms, kJ to kcal (1 decimal), sodium from g to mg, the 404 not-found case, and the lowest-rank serving. `tsc` is clean, and there's no `any`.

Problems found on review:
1. **"Both sources failed" was detected as "no results and any error".** So when USDA failed and Open Food Facts legitimately found nothing, `searchFoods` threw instead of returning an empty list with one error.
2. **The `signal` option was accepted but never passed to `fetch`.** The debounced search box needs it to cancel stale requests.
3. **The key-leak test didn't test anything.** `rejects.toThrow('USDA search failed (HTTP 403)')` is a substring match, so a message with the key appended still passed. My mutation check proved it.
4. **The brief's "1 banana" serving test was missing.** The code was right, but nothing locked it in.
5. **Minor issues:**
   - The barcode wasn't URL-encoded.
   - The error text said `(403)` instead of the brief's `(HTTP 403)`.
   - The data-type test only checked "is an array".
   - Two unused type aliases.
6. **Its report again misdescribed the brief.** It said the brief asked for whole-number kcal from kJ; the brief says 1 decimal, which the code correctly does.

## What I changed
- **`search.ts`:**
  - Throws only when **both** sources failed.
  - Passes `signal` through to both requests.
  - Removed the unused aliases.
- **`usda.ts`:** passes `signal` to `fetch`, URL-encodes the key, and the error says `(HTTP <status>)`.
- **`off.ts`:**
  - Passes `signal` to both functions, and the options default to `{}`.
  - Trims and URL-encodes the barcode.
  - The error wording says `(HTTP <status>)`.
  - A comment explains why the JSON is parsed before the status check.
- **Tests (27 to 30):**
  - **New:** the lowest-rank "1 banana (126 g)" serving; USDA failing while Open Food Facts finds nothing (empty, one error, no throw); and `signal` reaching both requests.
  - **Fixed:** the key-leak test now asserts the exact message and `not.toContain(key)`.
  - **Tightened:** the POST test checks the exact three data types and the method.

### Mutation check
I broke one rule at a time; each break must make a test fail:

| Break | Caught |
|---|---|
| sodium left in grams | yes |
| no 2047/2048 energy fallback | yes |
| first measure instead of lowest rank | yes |
| API key appended to the error | **no** with the model's test; **yes** after my fix |
| throwing when only one source fails | yes |
| reading `products` instead of `hits` | yes |
| treating the 404 not-found as an error | yes |

Final state: `npm test` 30/30, `npm run build` clean, `npm run test:db` 31/31.

## How I would have done it
- **Capture fixtures first, as a separate step I own, and check every URL live before putting it in a brief.** Both run-1 problems trace back to URLs I wrote from memory. `scripts/save-food-fixtures.mjs` is now that step.
- **A small `isRecord` / `num` helper module** shared by both parsers, instead of repeated `as Record<string, unknown>` casts.
- **Mutation-test any "must never" rule** (like the API key) from the start. A test named after a rule doesn't mean it tests the rule.

## Verdict
**Run 1 was unusable, and the brief was partly to blame. Run 2 was usable after small but real fixes.** Lessons:
1. **When the network fails, the 35B fabricates rather than stops,** even at High effort, and its report hides it. Briefs that depend on outside data must supply that data, and must say "stop and report" explicitly.
2. **Verify external URLs and response shapes before writing a brief.** The model followed my wrong URLs faithfully.
3. **The 35B's self-reports aren't reliable on details.** Twice in this task it described the brief incorrectly. Always check claims against the code.
4. **Mutation checks earn their keep.** They found a security test that couldn't fail.
