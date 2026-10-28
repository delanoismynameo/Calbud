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

### Step 1: save real sample responses (fixtures)
The tests must use **real** API responses, not invented ones. Download them with `curl` or `node -e "fetch(...)"` into `src/food/__fixtures__/`, then **trim each file to its first 5 results**, keeping their fields unchanged.

| File | URL |
|---|---|
| `usda-search-egg.json` | `https://api.nal.usda.gov/fdc/v1/foods/search?query=egg&pageSize=5&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)&api_key=DEMO_KEY` |
| `usda-search-banana.json` | same, with `query=banana` |
| `off-search-oatmeal.json` | `https://world.openfoodfacts.org/cgi/search.pl?search_terms=oatmeal&search_simple=1&json=1&page_size=5&fields=code,product_name,brands,serving_size,serving_quantity,nutriments` |
| `off-product-nutella.json` | `https://world.openfoodfacts.org/api/v2/product/3017620422003.json?fields=code,product_name,brands,serving_size,serving_quantity,nutriments` |

Look at these files before writing the parsers. **Field names in this brief are a guide; the fixtures are the truth.** If they disagree, follow the fixture and say so in your reply.

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
    - Otherwise use the first `foodMeasures` entry with `gramWeight > 0`, labelled with its `disseminationText`.
    - Otherwise both are `null`.
  - Use `description` as the name and `brandOwner` (or `null`) as the brand.
- **`searchUsda(query, { apiKey, fetchFn = fetch, signal })`** returns `Promise<FoodResult[]>`.
  - It calls `https://api.nal.usda.gov/fdc/v1/foods/search` with:
    - `query` (URL-encoded)
    - `pageSize=25`
    - `dataType=Foundation,SR Legacy,Survey (FNDDS)` (generic foods only; Open Food Facts covers packaged foods)
    - `api_key`
  - It maps results through `normalizeUsdaFood` and drops the `null`s.
  - On a non-OK response it throws `Error('USDA search failed (HTTP <status>)')`. **The error must never include the API key.**

**`off.ts`**
- **`normalizeOffProduct(raw: unknown): FoodResult | null`** reads `product_name` (the name), `brands` (the first brand before a comma, or `null`), `code`, and `nutriments`:
  - **Energy:** `energy-kcal_100g`. If that's missing, use `energy-kj_100g / 4.184`, rounded to 1 decimal place.
  - **Protein, carbs, fat:** `proteins_100g`, `carbohydrates_100g`, `fat_100g`.
  - **Fibre and sugar:** `fiber_100g` and `sugars_100g`, or `null` when missing.
  - **Sodium:** `sodium_100g` is in **grams**, so multiply by 1000 for mg (`null` if missing).
  - **Serving:** `serving_quantity` when it's a positive number, labelled with `serving_size`.
  - **Return `null`** if there is no name, or energy, protein, carbs or fat is missing.
  - `sourceId` and `barcode` are both the `code`.
- **`searchOff(query, { fetchFn = fetch, signal })`** calls the search URL from the fixture table with `page_size=20` and the query URL-encoded. It maps `products` through `normalizeOffProduct`. On a non-OK response it throws `Error('Open Food Facts search failed (HTTP <status>)')`.
- **`lookupBarcode(code, { fetchFn = fetch, signal })`** returns `Promise<FoodResult | null>`, using the product URL. It returns `null` when the response has `status: 0` (product not found) or the product doesn't normalise.

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
- **Never call the real network in tests.** Pass a fake `fetchFn` that returns `new Response(JSON.stringify(fixture))` and records the URL it was called with.

Include at least these tests (more is fine):
- **nutrition**
  - 150 g of a food with 143 kcal / 12.6 g protein per 100 g gives 215 kcal and 18.9 g protein.
  - Rounding works for kcal and the macros.
  - 0, a negative number and `NaN` each throw `RangeError`.
- **usda**
  - Every egg fixture item normalises to a `FoodResult` with `source: 'usda'` and a numeric `kcal100g`.
  - The banana fixture normalises too.
  - A copy of a fixture item with nutrient 1008 removed falls back to 2047.
  - An item with protein removed returns `null`.
  - `searchUsda` builds a URL containing the encoded query, `pageSize=25` and the three data types.
  - On a 403, `searchUsda` throws, and the message doesn't contain the key.
- **off**
  - The oatmeal fixture normalises, and items without a name or core values are dropped.
  - Sodium is converted from g to mg.
  - The kJ fallback works (on an edited copy of the fixture).
  - `lookupBarcode` on the Nutella fixture returns a result whose `barcode` is `3017620422003`.
  - `{ "status": 0 }` returns `null`.
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
