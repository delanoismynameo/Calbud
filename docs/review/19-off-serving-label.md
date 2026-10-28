# 19: Open Food Facts serving labels without repeated grams

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript app. Packaged foods come from Open Food Facts. `normalizeOffProduct` in `src/food/off.ts` builds a serving label from the product's `serving_size` text and its `serving_quantity` number:

```ts
servingLabel = sizeText !== '' ? `${sizeText} (${servingG} g)` : `1 serving (${servingG} g)`
```

**The bug:** `serving_size` often already contains the grams, so the app shows `0.75 cup (50 g) (50 g)`. Your job: don't add the grams when the text already has a gram amount.

### Read only these files
- This file.
- `src/food/off.ts`: the function you change (lines 70–77).
- `src/food/off.test.ts`: the tests you add to.

### 1. Change `src/food/off.ts`
Add and export a small function, and use it in place of the line above:
```ts
export function offServingLabel(sizeText: string, servingG: number): string
```
Rules, in order:
1. Trim `sizeText`. If it is empty, return `` `1 serving (${servingG} g)` ``.
2. If the trimmed text already contains a **gram amount**, return the trimmed text unchanged. A gram amount is a number, then optional spaces, then `g`, `gr`, `gram` or `grams` as a whole word, in any case. Use this regex: `/\d\s*(g|gr|grams?)\b/i`. So `50 g`, `50g`, `(30 G)`, `28.5 grams` and `1,5 g` count; `250 mg`, `1 kg` and `2 cookies` do not.
3. Otherwise return `` `${trimmed} (${servingG} g)` ``.

Change nothing else in `off.ts`.

### 2. Add tests to `src/food/off.test.ts`
Add a new `describe('offServingLabel', …)` block at the end of the file and import `offServingLabel`. Leave the existing tests exactly as they are. One `it` each:

| `sizeText` | `servingG` | expected |
|---|---|---|
| `'0.75 cup (50 g)'` | 50 | `'0.75 cup (50 g)'` |
| `'30g'` | 30 | `'30g'` |
| `'1 bar (40 G)'` | 40 | `'1 bar (40 G)'` |
| `'2 cookies'` | 28 | `'2 cookies (28 g)'` |
| `'1 tablet (250 mg)'` | 0.3 | `'1 tablet (250 mg) (0.3 g)'` |
| `''` | 15 | `'1 serving (15 g)'` |
| `'   '` | 15 | `'1 serving (15 g)'` |
| `'  1 cup  '` | 240 | `'1 cup (240 g)'` |

Then one more `it` that goes through `normalizeOffProduct`: build a product inline (no fixture file) with `code: '123'`, `product_name: 'Test cereal'`, `serving_size: '0.75 cup (50 g)'`, `serving_quantity: 50`, and `nutriments` with `'energy-kcal_100g': 380`, `proteins_100g: 8`, `carbohydrates_100g: 80`, `fat_100g: 3`. Expect `servingLabel` to be `'0.75 cup (50 g)'` and `servingG` to be `50`.

### Rules
- Don't change any other file. Don't run git commands. Don't create `.env` files. Don't add packages. Don't create any other files.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm test` passes: the 101 existing tests plus your 9. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed.
3. You have re-read this brief and checked each numbered section against your code.

Reply with: the files changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI.
- **Wall time:** about **4 min**, 17 steps.
- **Outcome:** finished. At first it called `offServingLabel(...)` without assigning the result. Its own integration test caught that, and it fixed it. Its report was accurate: 110 tests, and the build lines were real.

## Result
- **Builds:** yes. **Tests:** 110 passing (101 + 9).
- Every case in the brief's table matches. Only `off.ts` and `off.test.ts` changed, and no stray files were created.
- **No click-through:** the change is a pure function, and `ServingPicker` shows the label as it is.

## What I changed
- `off.test.ts`: renamed two tests that described the wrong thing ("gr without space" for `30g`, and "trims" for a case with nothing to trim).

## Verdict
Usable as delivered. The integration test through `normalizeOffProduct` paid off: it caught the missing assignment, which the unit tests alone would have missed.
