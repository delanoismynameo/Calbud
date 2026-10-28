# 11: Packaged foods from USDA Branded (replace Open Food Facts text search)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`. The food search in `src/food/` merges USDA generic foods with Open Food Facts text search. **Open Food Facts text search turned out to be blocked in browsers** (no CORS headers), so it must be replaced with **USDA's Branded foods**, from the same API and key. Open Food Facts stays only for **barcode lookup** (`lookupBarcode`), which does work in browsers.

### Read only these files
- This file.
- `src/food/types.ts`, `src/food/usda.ts`, `src/food/usda.test.ts`, `src/food/off.ts`, `src/food/off.test.ts`, `src/food/search.ts`, `src/food/search.test.ts`, `src/pages/AddFood.tsx`.
- The fixtures in `src/food/__fixtures__/`, especially the new **`usda-branded-oatmeal.json`** and **`usda-branded-greek-yogurt.json`**. These are real USDA Branded responses. Read them before changing the parser.

**Never download, edit, regenerate or invent fixtures, and never call the real network.** For a variation, copy an item *inside a test* and change the copy. If a fixture disagrees with this brief, follow the fixture and say so in your reply. If you can't continue, stop and say what is missing.

### Changes

**1. `usda.ts`**
- **`searchUsda` gets an option `kind?: 'generic' | 'branded'`** (default `'generic'`). The POST body's `dataType` is:
  - `["Foundation", "SR Legacy", "Survey (FNDDS)"]` for `generic` (unchanged)
  - `["Branded"]` for `branded`

  Everything else stays the same: POST, `pageSize: 25`, `signal` passed to `fetch`, the error text, and the key never appearing in errors.
- **`normalizeUsdaFood` changes.** Generic foods must come out **exactly as before**.
  - **Brand:** the trimmed `brandName` if it's non-empty. Otherwise the trimmed `brandOwner` if that's non-empty. Otherwise `null`. In the fixtures, `brandName` is sometimes `""` and sometimes missing.
  - **Barcode:** the `gtinUpc` string if it's non-empty, otherwise `null`.
  - **Serving label:** this applies when `servingSize` is used, meaning its unit is `g` or `GRM`.
    - If `householdServingFullText` is non-empty **and isn't just a gram amount** (like `45 GRM` or `74 g`), the label is `<householdServingFullText> (<servingSize> g)`, e.g. `2 Slices (50 g)`.
    - Otherwise it's `1 serving (<servingSize> g)`.
    - Other units (e.g. `IU`) still give **no** serving from `servingSize`.
  - **Capitals:** if the name, or the brand, has **no lowercase letters**, convert it to title case with a new exported helper, `titleCase(s: string): string`. It lower-cases everything, then capitalises the first letter of the string and every letter that follows a space, `-`, `/`, `(` or `&`. **It doesn't capitalise after an apostrophe.** Examples:
    - `GREEK YOGURT` → `Greek Yogurt`
    - `TRADER JOE'S` → `Trader Joe's`
    - `OATMEAL BREAD, OATMEAL` → `Oatmeal Bread, Oatmeal`

    Text that already has lowercase letters is left unchanged.

**2. `search.ts`**
`searchFoods` now runs **`searchUsda(..., { kind: 'generic' })` and `searchUsda(..., { kind: 'branded' })`** together with `Promise.allSettled`, and **no longer calls Open Food Facts**.
- **Results:** all generic results first, then branded ones, with duplicates removed as before. **Cap at 30.**
- **Errors:** prefix each with its source, as `Basic foods: <message>` or `Packaged foods: <message>`. A network failure's message, like `Failed to fetch`, gets the same prefix.
- **Both fail:** throw an `Error` whose message joins both prefixed messages.
- **Unchanged:** a query under 2 characters makes no fetch, and the function signature stays the same.

**3. `off.ts`**
**Delete `searchOff`**, and remove its tests. Keep `normalizeOffProduct` and `lookupBarcode` and their tests unchanged. The oatmeal `hits` fixture is still a valid product list for the normaliser tests.

**4. `AddFood.tsx`**
Only the small source tag on each result changes. It should read `Packaged` when the food has a `barcode`, and `Basic` otherwise.

### Tests (vitest; add to the existing files)
- **`usda.test.ts`:**
  - From `usda-branded-oatmeal.json`:
    - The first item (fdcId `1995469`, which is missing a macro) gives `null`.
    - fdcId `2055229` gives brand `Foska`, barcode `036423350200`, `servingG` 74, label `1 serving (74 g)`, and name `Oatmeal`.
    - fdcId `2110080` gives the label `2 Slices (50 g)` and brand `Pepperidge Farm`.
    - fdcId `2503998` (unit `IU`, empty `brandName`) gives `servingG` `null` and brand `Thomas Brothers Ham Company`.
  - From `usda-branded-greek-yogurt.json`: fdcId `373595` (no `brandName`) gives brand `Trader Joe's` and name `Greek Yogurt`.
  - `titleCase` gives the three examples above. A string that already has lowercase letters is returned unchanged by the normaliser.
  - With `kind: 'branded'`, the POST body has `dataType: ["Branded"]`. The default is still the three generic types.
  - Every item in the existing generic fixtures still gives `barcode: null`, and their names are unchanged (they're already mixed case).
- **`search.test.ts`** (replace the Open Food Facts-based tests):
  - `searchFoods` makes exactly two fetches, both to `api.nal.usda.gov`, one with each `dataType`. No URL contains `openfoodfacts`.
  - Generic results come before branded ones.
  - A generic failure gives one `Basic foods: …` error and still returns the branded results, and the reverse.
  - Both failing throws.
  - The cap is 30.
  - Duplicates are removed.
  - A short query makes no fetch.

### Rules
- TypeScript only, with no `any`, and no new dependencies.
- Use one write per new file. Change existing files with small `edit`s, except that rewriting a whole **test** file is allowed.
- Don't change files not listed here. Don't run git commands.

### Done when
1. `npm test` passes.
2. `npm run build` passes with no TypeScript errors.
3. `npm run test:db` still prints `31 passed, 0 failed`.
4. Searching `src` for `searchOff` finds nothing.
5. You have re-read this brief section by section.

Reply with: the files changed, the test count, the build result, any fixture disagreement, and anything you were unsure about. **Report only what you actually did and saw.**
