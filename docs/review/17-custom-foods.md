# 17: Custom foods (with a delegated helper)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Two partners log food. Your job: let them **create their own food** (for example "Sunday chili, 1 bowl, 350 g, 420 kcal") on the Add food screen, then log it like any other food. Once logged or starred, custom foods show in Recent and Favorites.

**This task has two parts, and you delegate part A.**
- **Part A,** the pure validator (sections A1 and A2 below), goes to a **subagent on the small model**.
- **Part B,** the screens (sections B1 to B5), is yours. You do it while the subagent works.

### Step 0: delegate part A first
Before writing any file, call your `subagent` tool **once** with:
- `provider`: `small-gpu`
- `model`: `qwen3.5:4b-32k`
- `reasoning_effort`: `medium`
- the task text, exactly:
  > Read the file docs/review/17-custom-foods.md in this workspace. Do ONLY sections A1 and A2: create src/food/customFood.ts and src/food/customFood.test.ts exactly as specified there. Don't create or change any other file, and don't run git. Run `npx vitest run src/food/customFood.test.ts` until it prints 8 passed. Reply with the last 5 lines it printed, pasted exactly.

If the tool refuses that provider or model, call `list_subagent_models`, pick `qwen3.5:4b-32k` from it, and try once more. If it still fails, write part A yourself, and say so in your reply.

Then go straight on to part B. Part B only **imports** `parseCustomFood` and `CustomFoodInput` from `./customFood`, and their exact shape is given in A1, so you don't need to wait. **Don't write `customFood.ts` or `customFood.test.ts` yourself** while the subagent is running.

When the subagent's completion notice arrives, **check its work**:
- read both files against A1 and A2
- run `npm test`
- if something is wrong, fix it yourself and **say exactly what you fixed** in your reply

### Read only these files
- This file.
- `src/food/types.ts`, `src/food/rows.ts`, `src/food/recents.ts`, `src/food/recents.test.ts` (lines 95–112), `src/food/useFavoriteFoods.ts`
- `src/pages/AddFood.tsx`
- `src/household/HouseholdStep.tsx`: only for the class constants (input and button styles) to copy.

---

### Part A (for the subagent)

#### A1. Create `src/food/customFood.ts`
```ts
import type { FoodResult } from './types'

export interface CustomFoodInput {
  name: string; servingLabel: string; servingG: string
  kcal: string; protein: string; carbs: string; fat: string   // all per serving, as typed
}
export type CustomFoodField = keyof CustomFoodInput
export type CustomFoodResult =
  | { ok: true; food: FoodResult }
  | { ok: false; errors: Partial<Record<CustomFoodField, string>> }

export function parseCustomFood(input: CustomFoodInput, id: string): CustomFoodResult
```
**Reading numbers:** trim the text and replace `,` with `.`. Empty text means "blank". Otherwise use `Number(text)`; anything that isn't a finite number is invalid.

**Rules.** Collect **every** error, not just the first:

| Field | Rule | Error text |
|---|---|---|
| `name` | trimmed; blank | `Enter a name.` |
| `name` | longer than 80 characters | `Keep the name under 80 characters.` |
| `servingLabel` | trimmed; blank becomes `1 serving`; longer than 40 characters | `Keep this under 40 characters.` |
| `servingG` | blank, invalid, `<= 0` or `> 2000` | `Enter the serving weight in grams (1–2000).` |
| `kcal` | blank, invalid, `< 0` or `> 5000` | `Enter calories (0–5000).` |
| `protein`, `carbs`, `fat` | blank becomes `0`; invalid, `< 0` or `> 1000` | `Enter grams (0–1000).` |

If there are no errors, return `{ ok: true, food }` where `food` is:
- `source: 'custom'`, `sourceId: id`
- `name`: the trimmed name, `brand: null`
- `servingG`: the grams, `servingLabel`: the trimmed label
- `kcal100g = r(kcal / servingG * 100)`, and the same for `protein100g`, `carbs100g` and `fat100g`, where `r(x) = Math.round(x * 100) / 100`
- `fiber100g`, `sugar100g`, `sodiumMg100g` and `barcode` are all `null`

#### A2. Create `src/food/customFood.test.ts`
Vitest (`import { describe, it, expect } from 'vitest'`). Use a helper `const base = (o = {}) => ({ name: 'Sunday chili', servingLabel: '1 bowl', servingG: '350', kcal: '420', protein: '28', carbs: '35', fat: '14', ...o })`. Exactly these 8 tests, one `it` each, with id `'id-1'`:
1. A valid input gives `ok: true` and this exact food, checked with `toEqual`: `{ source: 'custom', sourceId: 'id-1', name: 'Sunday chili', brand: null, servingG: 350, servingLabel: '1 bowl', kcal100g: 120, protein100g: 8, carbs100g: 10, fat100g: 4, fiber100g: null, sugar100g: null, sodiumMg100g: null, barcode: null }`.
2. Blank `protein`, `carbs` and `fat` become 0 (`protein100g`, `carbs100g` and `fat100g` are 0).
3. A comma decimal works: `servingG: '100', kcal: '12,5'` gives `kcal100g` 12.5.
4. A blank name and a whitespace-only name both give `errors.name === 'Enter a name.'`.
5. `servingG` of `''`, `'0'`, `'2001'` and `'abc'` each give the `servingG` error.
6. `kcal` of `'-1'` and `'5001'` each give the `kcal` error.
7. A blank `servingLabel` gives `servingLabel: '1 serving'`.
8. `name: ''` together with `kcal: 'x'` gives `ok: false` with **both** `errors.name` and `errors.kcal` set.

---

### Part B (yours)

#### B1. Let custom foods flow through
- `src/food/types.ts`: `FoodSource` becomes `'usda' | 'off' | 'custom'`.
- `src/food/recents.ts`:
  - remove the line that skips `'custom'` foods
  - in `foodResultFromRow`, the `source` cast becomes `row.source` (no cast needed now)
- `src/food/recents.test.ts`: the test `'custom foods are skipped'` becomes `'custom foods are kept'` and expects length **2**. Change only that test.
- `src/food/useFavoriteFoods.ts`: remove the `.neq('source', 'custom')` line.

#### B2. Create `src/food/CustomFoodForm.tsx`
A default-exported component: `CustomFoodForm({ onSaved, onCancel }: { onSaved: (food: FoodResult) => void; onCancel: () => void })`.
- **State:** one `CustomFoodInput` object, starting with every field `''`. Also `errors`, `saving` and `saveError`.
- **Layout:** a `<form>` in `bg-slate-800 rounded-lg p-4 space-y-3`:
  - heading `Create a food`
  - labelled inputs: `Name`, `Serving name` (placeholder `1 serving`), `Serving weight (g)`, then a `grid grid-cols-2 gap-2` with `Calories`, `Protein (g)`, `Carbs (g)` and `Fat (g)`
  - a small grey note under the grid: `Per serving. An estimate is fine.`
  - every number input uses `inputMode="decimal"`
  - each field's error shows right under it, in `text-red-400 text-xs`
- **Buttons:** `Save` (`type="submit"`, shows `Saving…` while saving, disabled while saving) and `Cancel` (`type="button"`, calls `onCancel`, disabled while saving).
- **On submit:**
  1. `const result = parseCustomFood(input, crypto.randomUUID())`
  2. If not ok, show the errors and stop.
  3. If ok: `supabase.from('foods').insert(foodRow(result.food, householdId))`, where `householdId` comes from `useProfile().profile?.household_id`.
  4. On error, show `error.message` in `saveError` and stop saving.
  5. On success, call `onSaved(result.food)`.

#### B3. Change `src/pages/AddFood.tsx`
- Add `const [creating, setCreating] = useState(false)`.
- **When `selected` is set,** show the `ServingPicker` as now.
- **Else when `creating`,** show `<CustomFoodForm onSaved={(food) => { setCreating(false); setSelected(food) }} onCancel={() => setCreating(false)} />` **instead of** the search box and lists.
- **Otherwise,** show everything as now, plus one button right **under the search box**: `+ Create a food`, `type="button"`, classes `w-full py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800`. It sets `creating` to true.

#### B4. Nothing else
Don't change `ServingPicker.tsx`, `logFood.ts` or `favorites.ts`. A custom food goes through them as it is: it has a `servingG`, so the picker starts in servings.

#### B5. Checks
`npm test` must pass: **92 tests** (the 84 existing, plus the subagent's 8, with the one recents test changed in place). `npm run build` must finish with no errors.

### Rules
- Don't change any file not named above. Don't run git commands. Don't create `.env` files. Don't add packages.
- Write each new file in one write, then fix with small `edit`s.
- Run tests with `npm test` or `npx vitest run …` (not `node --test`).

### Reply with
1. **Delegation:** whether the subagent started (paste the tool result line), what it replied, and anything you had to fix in its files.
2. The files you created and changed.
3. The `Tests` line from `npm test`, and the last 5 lines of `npm run build`, both pasted exactly.
4. Anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI. The subagent was `qwen3.5:4b-32k` on the RTX 3050, at medium effort.
- **Wall time:** about 5 min for the 35B. The 4B ran about 6.5 min, ran out of output tokens, and its context was full.

## The delegation, as it actually happened
1. **The 35B delegated correctly:** it called `list_subagent_models`, then `subagent` with the exact task text. Both GPUs ran at once: the 3050 at 94%.
2. **The 4B read the whole brief, including Step 0, and tried to delegate too.** The harness refused ("subagent depth 2 exceeds maxDepth 1"). It tried again, then started on A1 itself.
3. **The 35B finished part B and didn't wait.** It checked the subagent's status ("still running") and decided the 4B was stuck. Then it **wrote `customFood.ts` and its tests itself**.
4. **The 4B then tried to write `customFood.ts`.** The harness refused, because the file had changed since it last read it. The 4B noticed the file existed, re-read it, and spent the rest of its run struggling with PowerShell output capture. That left four stray files in the repo root (`build.txt`, `vitest*.txt`), which I deleted.
5. **The 35B's report said the subagent "produced no output".** That's true for the files, but it hides that the subagent was making progress and was overtaken by the 35B.

**So no code from the 4B shipped.** The plumbing works. What failed:
- **The brief:** Step 0 should have said "only the agent that received this from the user does this".
- **Timing:** the 4B at about 30 tok/s couldn't finish before the 35B ran out of other work. The 35B then took over, as its fallback rule allowed.

## Result
- **Builds:** yes. **Tests:** 93 passing (84 + 8 + my 1).
- **Click-through** at 375 px against the mock:
  - saving an empty form shows the name, weight and calories errors
  - Sunday chili (1 bowl, 350 g, 420/28/35/14) saves, and the picker shows exactly those numbers back
  - logging it puts 420 kcal under Lunch, and the totals update
  - it then tops Recent, and starring it moves it to Favorites
  - the mock database holds exactly one chili row, with no duplicates

## What I changed
- **`CustomFoodForm.tsx`:**
  - **Save errors were swallowed.** It used `try/catch` around a Supabase call, which reports failures in `error` instead of throwing, so a failed save still closed the form.
  - It copied `foodRow()` field by field; it now calls `foodRow()`.
  - Number fields didn't clear their error while typing.
  - Cancel was styled as a primary button.
  - It now has a guard for a missing household.
- **`customFood.ts`:** a macro field with only spaces was an error instead of blank = 0. I added a test for it.
- **`recents.ts`:** removed a leftover blank line.

## Verdict
Usable after real fixes in the form. For delegation:
- **Give the subagent its own short brief file,** with no Step 0 in it.
- **Tell the parent to wait for the completion notice** before writing the delegated files.
- **Pick work the 4B can finish while the parent is still busy.**
