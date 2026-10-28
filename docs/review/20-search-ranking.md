# 20: Better food search ranking

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript app. Users search for foods. `searchFoods` in `src/food/search.ts` sends the text to USDA twice: once for basic foods (`kind: 'generic'`) and once for packaged foods (`kind: 'branded'`). It then lists the basic results first, followed by the packaged ones, at most 30 in total.

**The bug:** USDA matches *any* word and gives cooking words a lot of weight. A search for `steamed vegetables` returns `Oysters, steamed`, `Clams, steamed`, `Fish, bass, steamed` … and no vegetables. `steamed broccoli` also returns oysters and fish first. The good matches (`STEAMED MIXED VEGETABLES`, `Broccoli, cooked`) are either further down, or never fetched at all.

**The fix, in two parts:**
- For basic foods, search without the cooking word.
- Then re-rank the whole merged list by how well each name matches the typed words.

### Read only these files
- This file.
- `src/food/types.ts`: `FoodResult`.
- `src/food/search.ts`: the function you change.
- `src/food/search.test.ts`: the tests you add to (read it all; the existing tests must keep passing).

### 1. Create `src/food/rank.ts`
```ts
export const COOKING_WORDS = ['steamed', 'boiled', 'grilled', 'baked', 'roasted', 'fried', 'broiled', 'sauteed', 'poached', 'cooked', 'raw']

export function words(text: string): string[]
export function splitQuery(query: string): { core: string; methods: string[] }
export function matchScore(food: FoodResult, query: string): number
export function rankResults(results: FoodResult[], query: string): FoodResult[]
```
- **`words(text)`**:
  - lowercase the text and split it on anything that isn't `a`–`z`
  - drop empty pieces
  - **stem** each piece: if it is longer than 3 letters and ends in `s`, remove that one `s`
  
  For example, `words('STEAMED MIXED VEGETABLES')` is `['steamed', 'mixed', 'vegetable']`. `words('Fish, bass, steamed')` is `['fish', 'bas', 'steamed']`. That's fine: both sides are stemmed the same way.
- **`splitQuery(query)`**:
  - lowercase and trim the query, split it on whitespace, and drop empty pieces
  - `methods` are the pieces that are in `COOKING_WORDS`, in order, without duplicates
  - `core` is the other pieces joined with one space, in order
  - **if `core` would be empty** (the query is only cooking words, like `steamed`), return `{ core: <the trimmed, lowercased query>, methods: [] }`
- **`matchScore(food, query)`**:
  - Let `nameWords` be the set of `words(food.name + ' ' + (food.brand ?? ''))`, and `{ core, methods } = splitQuery(query)`.
  - **+2** for each *distinct* word in `words(core)` that is in `nameWords`.
  - **+2** for each word in `methods` that is in `nameWords`.
  - **+1** only when all of these hold: `methods` is not empty, none of the methods matched, `methods` does not include `'raw'`, and `nameWords` has `'cooked'`.

  `uncooked` is a different word, so it never counts as `cooked`.
- **`rankResults(results, query)`**: returns a new array sorted by `matchScore`, highest first. **Ties keep their input order** (a stable sort). It must not change the input array.

### 2. Create `src/food/rank.test.ts`
Vitest. Build `FoodResult`s with a small helper, e.g. `food(name, brand = null)`, filling the other fields with any valid values. One `it` each:

**`words`**
1. `words('STEAMED MIXED VEGETABLES')` → `['steamed', 'mixed', 'vegetable']`
2. `words('Broccoli, cooked, from restaurant')` → `['broccoli', 'cooked', 'from', 'restaurant']`
3. `words('  ')` → `[]`

**`splitQuery`**

| query | expected |
|---|---|
| `'Steamed vegetables'` | `{ core: 'vegetables', methods: ['steamed'] }` |
| `'grilled chicken breast'` | `{ core: 'chicken breast', methods: ['grilled'] }` |
| `'oatmeal'` | `{ core: 'oatmeal', methods: [] }` |
| `'steamed'` | `{ core: 'steamed', methods: [] }` |
| `'  Raw  Broccoli '` | `{ core: 'broccoli', methods: ['raw'] }` (note the double space) |

**`matchScore`**, with query `'steamed vegetables'`:

| food name | brand | score |
|---|---|---|
| `'STEAMED MIXED VEGETABLES'` | null | 4 |
| `'Classic mixed vegetables, cooked'` | null | 3 |
| `'Oysters, steamed'` | null | 2 |
| `'Babyfood, vegetables, mix vegetables junior'` | null | 2 (vegetables counts once) |
| `'Chicken breast tenders, uncooked'` | null | 0 |

and two more:
- query `'raw broccoli'`, food `'Broccoli, cooked'` → 2 (no cooked bonus for raw)
- query `'steamed vegetables'`, food `'Mixed blend'` with brand `'Steamed Veggie Co'` → 2 (the brand counts)

**`rankResults`**
1. With query `'steamed vegetables'` and input in this order: `Oysters, steamed`, `Fish, bass, steamed`, `Classic mixed vegetables, cooked`, `STEAMED MIXED VEGETABLES`. The output order is `STEAMED MIXED VEGETABLES`, `Classic mixed vegetables, cooked`, `Oysters, steamed`, `Fish, bass, steamed`.
2. Ties keep input order: three foods that all score 0, in the same order out.
3. The input array is unchanged afterwards.

### 3. Change `src/food/search.ts`
- Import `splitQuery` and `rankResults` from `./rank`.
- After `trimmed` is computed: `const { core } = splitQuery(trimmed)`.
- The **generic** call searches `core`. The **branded** call still searches `trimmed` (packaged food names often contain the cooking word, like `STEAMED MIXED VEGETABLES`).
- Merging: keep the dedupe and the error handling exactly as they are, but **remove the `if (results.length >= 30) break` lines** so every result from both sources is collected (generic first, then branded, as now). Then return `{ results: rankResults(results, trimmed).slice(0, 30), errors }`.
- Change nothing else in the file.

### 4. Add two tests to `src/food/search.test.ts`
Add them inside the existing `describe('searchFoods', …)`, at its end. Leave the existing tests exactly as they are. For both tests, the mock fetch reads `JSON.parse(init.body).dataType` and `.query` to tell the two calls apart, instead of counting calls.
1. **`'the generic search drops the cooking word; the branded one keeps it'`**: search `'Steamed vegetables'`; the generic call's `query` is `'vegetables'`, and the branded call's is `'Steamed vegetables'`.
2. **`'results are ranked by match across both sources'`**:
   - the generic call returns `Babyfood, vegetables, mix vegetables junior`, then `Classic mixed vegetables, cooked`
   - the branded call returns `STEAMED MIXED VEGETABLES`
   - searching `'steamed vegetables'`, the names come out as `STEAMED MIXED VEGETABLES`, `Classic mixed vegetables, cooked`, `Babyfood, vegetables, mix vegetables junior`

   Build these USDA foods in the same shape as the existing tests (`fdcId`, `description`, `foodNutrients` with ids 1008, 1003, 1004 and 1005; add `brandOwner` for the branded one).

### Rules
- Don't change any other file. Don't run git commands. Don't create `.env` files. Don't add packages. Don't create any other files.
- Write each new file in one write, then fix with small `edit`s.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm test` passes: the 110 existing tests plus your new ones (3 + 5 + 7 + 3 + 2 = 20). **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed.
3. You have re-read this brief, and checked each numbered section and every table row against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI.
- **Wall time:** **9 min 20 s**, 27 steps.
- **Outcome:** finished, and its report was accurate.
- **One gap in my brief:** `searchUsda` title-cases all-caps names, so `STEAMED MIXED VEGETABLES` comes back as `Steamed Mixed Vegetables`. It found this by reading `usda.ts` and adjusted the mock and the expected name. That was a correct call.

## Result
- **Builds:** yes. **Tests:** 130 passing (110 + 18 + 2).
- **Real USDA check:** I ran `searchFoods` with the real key from a throwaway script. The top results:

  | Search | Top result |
  |---|---|
  | steamed vegetables | "Steamed Mixed Vegetables", then steamed vegetable dumplings |
  | steamed broccoli | "Broccoli…, cooked" items |
  | grilled chicken breast | "Chicken breast, grilled…" |
  | baked salmon | "Fish, salmon, baked or broiled" |
  | raw spinach | "Spinach, raw" |

  Searches with no cooking word (oatmeal, greek yogurt, banana) keep USDA's order.

## What I changed
- `rank.ts`: a repeated cooking word (`steamed steamed broccoli`) went into `core`, and so into the basic-foods search. It is now skipped. Added 1 test.

## Verdict
Usable after a one-line fix. When a brief quotes names that a function will output, check how that function transforms them (here, the title-casing).
