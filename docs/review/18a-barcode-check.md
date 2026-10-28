# 18a: Barcode check (small task)

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a TypeScript app tested with Vitest. Create **two files** and nothing else.

## 1. Create `src/food/barcode.ts`
```ts
export function normalizeBarcode(text: string): string | null
```
1. Remove every space and `-` from `text`.
2. If what's left is not **only digits**, return `null`.
3. If its length is not 8, 12, 13 or 14, return `null`.
4. **Length 8:** return it as is, with no check-digit test, because it may be a short UPC-E code.
5. **Length 12, 13 or 14:** test the check digit, which is the last digit.
   - Take all the digits except the last.
   - Starting from the **rightmost** of those, multiply them by 3, 1, 3, 1, … and add the products up into `sum`.
   - The check digit must equal `(10 - sum % 10) % 10`. If it does, return the digits; if not, return `null`.

## 2. Create `src/food/barcode.test.ts`
Start with `import { describe, it, expect } from 'vitest'` and `import { normalizeBarcode } from './barcode'`. Inside `describe('normalizeBarcode', …)`, write exactly these 8 tests, one `it` each:
1. `'3017624010701'` returns `'3017624010701'`.
2. `' 3017-6240 10701 '` returns `'3017624010701'`.
3. `'3017624010702'` (wrong check digit) returns `null`.
4. `'036000291452'` (12 digits) returns `'036000291452'`.
5. `'10036000291459'` (14 digits) returns `'10036000291459'`.
6. `'01234565'` and `'12345678'` (8 digits) both return themselves.
7. `'30176abc10701'` returns `null`.
8. `''`, `'1234567'` and `'1234567890'` all return `null`.

## Rules
- Create only those two files. Don't change any other file. Don't run git. Don't create any other file, not even to save command output.
- Run `npx vitest run src/food/barcode.test.ts`. When it shows 8 passed, you are done.
- **Reply with one line:** the `Tests` line it printed.
