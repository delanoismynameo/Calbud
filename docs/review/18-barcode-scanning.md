# 18: Barcode scanning

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Two partners log food. Your job: on the Add food screen, let them **scan a packaged food's barcode** with the phone camera, or **type the barcode**, look it up in Open Food Facts, and log it.

**Already in place:**
- `lookupBarcode(code)` in `src/food/off.ts` returns a `FoodResult`, or `null` when Open Food Facts doesn't know the code. It throws on network errors. Don't change it. It works from the browser: Open Food Facts allows it.
- The package **`@zxing/browser` is installed.** Don't install anything else.

### Step 0: start the helper, then do your own part
**Before writing any file,** call your `subagent` tool **once** with:
- `provider`: `small-gpu`
- `model`: `qwen3.5:4b-32k`
- `reasoning_effort`: `medium`
- the task text, exactly:
  > Read the file docs/review/18a-barcode-check.md in this workspace and do exactly what it says. That file is your whole task.

It creates `src/food/barcode.ts`, which exports `normalizeBarcode(text: string): string | null`. That function returns the cleaned digits, or `null` if the text isn't a valid barcode. Your code imports it.

**Don't create, open or change `src/food/barcode.ts` or `src/food/barcode.test.ts` yourself.** When your own part is done, **end your turn and wait** for the subagent's completion notice. Don't poll, and don't take over its work because it seems slow; it runs on a small GPU and is slower than you.

When the notice arrives:
- run `npm test` and `npm run build`
- read its two files against `docs/review/18a-barcode-check.md`
- fix anything wrong, and say what you fixed

If the notice says it **failed**, write the two files yourself from `18a-barcode-check.md`, and say so.

### Read only these files
- This file.
- `src/food/off.ts`: only `lookupBarcode`, at the bottom.
- `src/pages/AddFood.tsx`
- `src/food/CustomFoodForm.tsx`: for the button and input styles.

### 1. Create `src/food/BarcodeScanner.tsx`
Default export `BarcodeScanner({ onCode, onCancel }: { onCode: (code: string) => void; onCancel: () => void })`.
- **Camera:** a `<video>` (`className="w-full rounded-lg bg-black aspect-[4/3] object-cover"`, `muted`, `playsInline`) held in a `useRef`. In a `useEffect` that runs once:
  ```ts
  import { BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'
  const reader = new BrowserMultiFormatOneDReader()
  reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current!, (result, _err, controls) => {
    if (result) { controls.stop(); onCodeRef.current(result.getText()) }
  })
  ```
  - Keep the `IScannerControls` that the promise resolves to, and call `.stop()` in the effect's cleanup. If the component unmounts before the promise resolves, stop the controls as soon as they arrive.
  - If the promise **rejects** (no camera, or permission denied), set `cameraError` to `Camera not available. Type the barcode below.` and hide the video.
  - Keep `onCode` in a ref (`onCodeRef`), so the effect never re-runs.
- **Typing instead:** under the video there's always a small form: a labelled input `Or type the barcode` (`inputMode="numeric"`, `autoComplete="off"`) and a `Look up` submit button. Submitting calls `onCode(text)`. Empty text does nothing.
- A `Cancel` button (secondary style, like CustomFoodForm's Cancel) calls `onCancel`.
- A short grey hint above the video: `Point the camera at the barcode.`

### 2. Change `src/pages/AddFood.tsx`
- **New state:** `scanning` (boolean), `lookingUp` (boolean), and `scanError` (`string | null`).
- **Buttons:** where the `+ Create a food` button is, show **two** buttons side by side in a `grid grid-cols-2 gap-2`: `Scan a barcode` (sets `scanning` true and clears `scanError`) and the existing `+ Create a food`. Both use the dashed style the Create button has now.
- **Which view shows.** The checks run in this order:

  | State | What shows instead of the search box and lists |
  |---|---|
  | `selected` | `ServingPicker`, as now |
  | `creating` | `CustomFoodForm`, as now |
  | `scanning` | `BarcodeScanner`, and under it `Looking up…` while `lookingUp`, or `scanError` in `text-red-400 text-sm` when set |
  | otherwise | the search box, the two buttons and the lists, as now |

- **`onCode(text)`, from the scanner:**
  1. `const code = normalizeBarcode(text)`. If it's `null`, set `scanError` to `That doesn't look like a barcode.` and stop.
  2. Set `lookingUp`, clear `scanError`, and `await lookupBarcode(code)` inside `try/catch/finally` (`finally` clears `lookingUp`).
  3. **Food found:** set `scanning` false and `selected` to the food.
  4. **`null`:** set `scanError` to `No match for ${code} in Open Food Facts. You can create it as a custom food.`
  5. **Thrown:** set `scanError` to `Couldn't look that up. Check your connection and try again.`
- **The scanner's `onCancel`** sets `scanning` false and clears `scanError`.
- While `lookingUp`, ignore further `onCode` calls.

### Rules
- Don't change any file not named above. Don't run git commands. Don't create `.env` files. Don't add packages. **Don't save command output to files.**
- Write each new file in one write, then fix with small `edit`s.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm test` passes: **101 tests** (93 + the subagent's 8).
2. `npm run build` finishes with no errors.

### Reply with
1. **Delegation:** the subagent's start result, its reply, and anything you fixed in its files.
2. The files you created and changed.
3. The `Tests` line, and the last 5 lines of `npm run build`, pasted exactly.
4. Anything you were unsure about. Report only what you actually did and saw.
