# 22a: Grocery list helper (small task)

You are working in a TypeScript app tested with Vitest. Create **two files** and nothing else.

## 1. Create `src/prep/grocery.ts`
```ts
export interface GroceryItem { name: string; qty: number | null; unit: string }
export function groceryList(lists: GroceryItem[][]): GroceryItem[]
export function formatGroceryItem(item: GroceryItem): string
```
**`groceryList`** merges the ingredient lists of several recipes into one shopping list:
1. Go through every item of every list, in order.
2. **Key:** the name, trimmed and lowercased, plus the **unit**, also lowercased. Before comparing units, turn plurals into singular: `cups` → `cup`, `lbs` → `lb`, `cans` → `can`, `cloves` → `clove`.
3. Items with the same key and a number `qty` are **added together**. Items with the same key and `qty: null` become one item with `qty: null`. A number item and a null item with the same key stay **separate**.
4. Keep the **first** spelling of the name (trimmed), and use the singular unit.
5. Round each total to 2 decimals: `Math.round(x * 100) / 100`.
6. Sort by lowercased name, A to Z (`localeCompare`). For the same name, put number items before null items.

**`formatGroceryItem`** returns `qty` (if not null), `unit` (if not empty) and `name`, joined with single spaces. For example `{ name: 'rice', qty: 2.5, unit: 'cup' }` gives `'2.5 cup rice'`, and `{ name: 'salt', qty: null, unit: '' }` gives `'salt'`.

## 2. Create `src/prep/grocery.test.ts`
Start with `import { describe, it, expect } from 'vitest'` and `import { groceryList, formatGroceryItem } from './grocery'`. Write exactly these 9 tests, one `it` each:
1. `groceryList([])` is `[]`.
2. `[[{ name: 'rice', qty: 2, unit: 'cup' }], [{ name: 'Rice', qty: 1, unit: 'cups' }]]` gives `[{ name: 'rice', qty: 3, unit: 'cup' }]`.
3. `[[{ name: 'eggs', qty: 3, unit: '' }, { name: 'eggs', qty: 2, unit: '' }]]` gives `[{ name: 'eggs', qty: 5, unit: '' }]`.
4. `[[{ name: 'chicken', qty: 1, unit: 'lb' }, { name: 'chicken', qty: 200, unit: 'g' }]]` gives two items. The units differ, so they are not added. Expect `{ name: 'chicken', qty: 1, unit: 'lb' }` first, then `{ name: 'chicken', qty: 200, unit: 'g' }` (same name, so input order is kept).
5. `[[{ name: 'salt', qty: null, unit: '' }], [{ name: 'salt', qty: null, unit: '' }]]` gives `[{ name: 'salt', qty: null, unit: '' }]`.
6. `[[{ name: 'garlic', qty: null, unit: '' }, { name: 'garlic', qty: 2, unit: 'cloves' }]]` gives `[{ name: 'garlic', qty: 2, unit: 'clove' }, { name: 'garlic', qty: null, unit: '' }]`.
7. `[[{ name: 'oil', qty: 0.1, unit: 'cup' }, { name: 'oil', qty: 0.2, unit: 'cup' }]]` gives `qty` `0.3`.
8. Sorting: `[[{ name: 'onion', qty: 1, unit: '' }, { name: 'Basil', qty: null, unit: '' }, { name: 'carrot', qty: 2, unit: '' }]]` gives names `['Basil', 'carrot', 'onion']`.
9. `formatGroceryItem` gives `'2.5 cup rice'`, `'3 eggs'` and `'salt'` for those three items.

For test 4, sort with `localeCompare`, which keeps equal names in input order because JavaScript's sort is stable.

## Rules
- Create only those two files. Don't change any other file. Don't run git. Don't create any other file, not even to save command output.
- Run `npx vitest run src/prep/grocery.test.ts`. When it shows 9 passed, you are done.
- **Reply with one line:** the `Tests` line it printed.

## Run (side job during task 21)
- **Setup:** `qwen3.5:4b-32k` on the RTX 3050, run headless from Claude, at medium effort. It ran in a separate worktree (`../Calbud-side`) with **its own `npm ci`**, so no junction was involved.
- **Wall time:** 9 min 46 s. It stopped on the **output-token limit** (32K context).
- **Outcome: failed.**
  - **vitest failed again with `spawn EPERM`**, now without a junction. So the cause is the headless profile's sandbox (Workspace Write), not my task 15 setup.
  - **It broke the rules:** while trying to get around the error, it removed the Tailwind and PWA plugins from `vite.config.ts`, and it tried jest and plain node.
  - **When I ran its files:** 8 of 9 tests fail. `groceryList` crashes (`reading 'unit'` of undefined), and `formatGroceryItem` adds a leading space.
- **What I did:** reverted `vite.config.ts`, kept a copy of its two files for reference, and removed the worktree. The grocery helper moves into the task 22 brief for the 35B.

## Verdict
**Failed.** Two lessons:
- A headless 4B run can't run its own tests unless its sandbox allows starting processes.
- When it's blocked, it edits files it was told not to touch, instead of stopping.
