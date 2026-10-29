# 31: Send the grocery list to Google Keep

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. The Prep page has a **Grocery list** tab. Add a **Send to Keep** button: it hands the list to the phone's share sheet (the user picks Google Keep there), and afterwards offers to clear the list. Google Keep has no API for personal accounts, so the share sheet is the way.

### Already done (don't redo)
- **The list:** `src/prep/GroceryList.tsx` shows the items and keeps per-phone ticks in `localStorage` under `calbud:grocery:<weekStart>`. Its `toggle` and `clear` functions, `loadTicks` and `saveTicks` already exist.
- **Item helpers:** `groceryList`, `formatGroceryItem` and `groceryKey` in `src/prep/grocery.ts`.

### Read only these files
- This file.
- `src/prep/GroceryList.tsx` and `src/prep/grocery.ts`.
- The first 20 lines of `src/prep/grocery.test.ts`, for the test style.

### Write in this order. Run `npm test` after step 2 before you continue.

### 1. `src/prep/sendList.ts` (new)
```ts
import type { GroceryItem } from './grocery'

// The text to send: one line per item NOT ticked, using formatGroceryItem, in the same order. No bullets, no header.
export function groceryText(items: GroceryItem[], ticked: Set<string>): string

export type SendResult = 'shared' | 'copied' | 'cancelled'

// The parts of `navigator` this needs, so tests can pass a fake.
export interface SendNav {
  share?: (data: { text: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}

export async function sendText(text: string, nav: SendNav): Promise<SendResult>
```
`sendText`:
- if `nav.share` exists: `await nav.share({ text })` and return `'shared'`. If it throws an error whose `name` is `'AbortError'` (the person closed the share sheet), return `'cancelled'`. Any other error is thrown again unchanged.
- else if `nav.clipboard` exists: `await nav.clipboard.writeText(text)` and return `'copied'`.
- else throw `new Error('This browser can neither share nor copy.')`.

`groceryText` uses `groceryKey(item)` to see whether an item is ticked.

### 2. `src/prep/sendList.test.ts` (new): one `it` each
Items for the tests: `[{ name: 'eggs', qty: 6, unit: '' }, { name: 'rice', qty: 2, unit: 'cup' }, { name: 'salt', qty: null, unit: '' }]`. Their keys are `eggs||q`, `rice|cup|q` and `salt||n`.
1. `groceryText(items, new Set())` equals `'6 eggs\n2 cup rice\nsalt'`.
2. With `new Set(['rice|cup|q'])` it equals `'6 eggs\nsalt'`.
3. With all three keys ticked it equals `''`.
4. `sendText('x', { share })` where `share` records its argument returns `'shared'` and `share` was called once with `{ text: 'x' }`.
5. When `share` rejects with an error whose `name` is `'AbortError'`, `sendText` returns `'cancelled'`.
6. When `share` rejects with `new Error('boom')`, `sendText` rejects with `boom`.
7. `sendText('x', { clipboard })` with no `share` returns `'copied'` and `writeText` got `'x'`.
8. If both exist, `share` is used and the clipboard is not touched.
9. `sendText('x', {})` rejects with `This browser can neither share nor copy.`

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 3. Change `src/prep/GroceryList.tsx`
Add the button and the question. Keep everything that is already there working the same.
- **New state:**
  - `sendState: 'idle' | 'sending' | 'asking'`, starting `'idle'`
  - `how: 'shared' | 'copied'`, starting `'shared'`
  - `sendError: string | null`, starting `null`
- **When `weekStart` changes,** the existing `useEffect` also sets `sendState` to `'idle'` and `sendError` to `null`.
- **The button:** `Send to Keep`, `type="button"`, in `text-sm text-blue-400 underline`, placed next to the existing `Clear ticks` button area: below the list, in the same block, before `Clear ticks`. Show it **only when the list has items** and `groceryText(items, ticked) !== ''` (nothing left to buy means nothing to send). While `sendState` is `'sending'` it reads `Sending…` and is disabled.
- **Clicking it:**
  1. clear `sendError`, set `sendState` `'sending'`
  2. `await sendText(groceryText(items, ticked), navigator)`. Pass the real `navigator` (it satisfies `SendNav`; if TypeScript complains, cast with `as unknown as SendNav`).
  3. result `'cancelled'`: set `sendState` back to `'idle'`
  4. result `'shared'` or `'copied'`: set `how` to the result and `sendState` to `'asking'`
  5. an error: set `sendError` to its `message` and `sendState` back to `'idle'`
- **The question,** shown only while `sendState === 'asking'`, in a `bg-slate-800 rounded-lg p-3 mt-3 text-sm space-y-2` box:
  - text: `Sent. Clear the list?` when `how` is `'shared'`, `Copied. Clear the list?` when it is `'copied'`
  - a small line under it, `text-xs text-gray-400`: `This ticks every item on this phone. Your prep sessions stay as they are.`
  - two buttons in a row: `Yes, clear` (blue, `px-3 py-1 rounded bg-blue-600 text-white font-semibold`) and `Not now` (grey, `px-3 py-1 rounded bg-slate-700 text-white`)
  - `Yes, clear` ticks **every** item: set `ticked` to a new `Set` of `groceryKey(item)` for all `items`, save it with `saveTicks(weekStart, …)`, then set `sendState` to `'idle'`
  - `Not now` sets `sendState` to `'idle'`
- **The error,** when `sendError` is set: `text-red-400 text-xs mt-1` under the button.
- **Never** change a prep session or call Supabase from this component.

### Rules
- **Files:**
  - create only `src/prep/sendList.ts` and `src/prep/sendList.test.ts`
  - change only `src/prep/GroceryList.tsx`
  - **never edit any file under `docs/`**
- **Don't:**
  - run git commands, create `.env` files, or add packages
  - create any other files, including files for build output: read the build's output in the terminal
- **Writing:** write each new file in one write, then fix with small `edit`s. Keep JSX ternaries shallow. In JSX text, write `…` as a plain character, never as an entity or number.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 9. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste its last 5 lines.**
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI. One brief.
- **Wall time:** about **5 min**, 29 steps.
- **Outcome:** finished. **It left the note alone** this time: the `docs/` ban held.

## Result
- **Builds:** yes. **Tests:** 245 passing (236 + 9).
- **Click-through** at 375 px against the mock, with `navigator.share` stubbed:
  - **Share sheet closed (AbortError):** no question.
  - **Share ok:** "Sent. Clear the list?". **Not now** hides it.
  - **Share throws:** the error shows under the button, and the button is not stuck on "Sending…" (after my fix).
  - **No share, clipboard only:** "Copied. Clear the list?". **Yes, clear** ticks all 6 items, and the Send button disappears.
  - **Text sent:** one line per item, e.g. `2 lb chicken thighs\ncurry roux\n6 eggs\n5 cup rice\nsalt\n2 tofu`.
- **Not testable here:** the real Android share sheet and Keep. That needs the user's phone, over HTTPS (the live site).

## What I changed
- **`GroceryList`:** the click handler had no `try/catch`, so a failed share left the button on "Sending…" and the error never showed. Added it.
- **`GroceryList`:** `useState('idle' as …)` became `useState<…>('idle')`.
- **`sendList.ts`:** the abort check used `instanceof Error`; it now reads `.name`, which also matches the share sheet's `DOMException` in every browser.

## Verdict
Usable after small fixes. The error path was the gap again: brief it explicitly next time ("a rejected promise must show its message and reset the state").
