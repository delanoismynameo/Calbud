# 29: "cal" instead of "kcal", Menu first on Prep, and editing goals

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Three small changes the users asked for:
1. **"cal":** show calories as `cal`, not `kcal`.
2. **Menu first:** the Prep page opens on **Menu**, its first tab.
3. **Editing goals:** each person can change their daily goals on the **Us** page. Today, goals can only be set during first-time setup.

### Already done (don't redo)
- **Where goals live:** `profiles.goal_calories`, `goal_protein_g`, `goal_carbs_g` and `goal_fat_g` are whole numbers, and a user may update their own.
- **The setup form:** `src/household/ProfileStep.tsx` sets goals during setup. Copy its style, its `supabase.from('profiles').update(...).eq('id', userId)` call, and `refresh()` from `useProfile()`.

### Read only these files
- This file.
- **For step 1, the lines named below:**
  - `src/today/EditMealLog.tsx`, `src/today/MealSection.tsx`
  - `src/pages/AddFood.tsx`, `src/pages/Today.tsx`, `src/pages/Prep.tsx`
- `src/household/ProfileStep.tsx`, `src/household/useProfile.ts` and `src/pages/Us.tsx`.
- The first 25 lines of `src/today/totals.test.ts`, for the test style.

### Write in this order. Run `npm test` after step 3 before you continue.

### 1. "kcal" → "cal" on screen
Change only these **visible texts**, nothing else (not variable names, not ids, not the word `Calories`):

| File | Now | Becomes |
|---|---|---|
| `src/today/EditMealLog.tsx` | `{scaled.kcal} kcal` | `{scaled.kcal} cal` |
| `src/today/MealSection.tsx` | `{sumLogs(logs).kcal} kcal` | `{sumLogs(logs).kcal} cal` |
| `src/today/MealSection.tsx` | `{Math.round(log.kcal)} kcal` | `{Math.round(log.kcal)} cal` |
| `src/pages/AddFood.tsx` (twice) | `kcal / 100 g` | `cal / 100 g` |
| `src/pages/Today.tsx` | `{total.kcal} / {goals.kcal} kcal` | `{total.kcal} / {goals.kcal} cal` |
| `src/pages/Today.tsx` | `` `${remaining} kcal left` `` and `` `${Math.abs(remaining)} kcal over` `` | `cal left` and `cal over` |
| `src/pages/Prep.tsx` | `` `${kcalPerServing(s.foods)} kcal each` `` | `` `${kcalPerServing(s.foods)} cal each` `` |

### 2. Menu first on Prep (`src/pages/Prep.tsx`)
- The `view` state starts as `'menu'`, not `'plan'`.
- **The switch buttons,** in this order: `Menu`, `Plan`, `Grocery list`. Keep their styles and handlers; only move the `Menu` button to the front.
- Change nothing else on the page.

### 3. `src/household/goals.ts` and `src/household/goals.test.ts`
```ts
export interface GoalInput { calories: string; protein: string; carbs: string; fat: string }
export interface Goals { goal_calories: number; goal_protein_g: number; goal_carbs_g: number; goal_fat_g: number }
export function parseGoals(input: GoalInput):
  | { ok: true; goals: Goals }
  | { ok: false; errors: Partial<Record<keyof GoalInput, string>> }
```
- **Reading each field:** trim it, then `Number()` it. It must be an integer (`Number.isInteger`).
- **`calories`** must be from 500 to 10000. Otherwise the error is `A whole number from 500 to 10000.`
- **`protein`, `carbs` and `fat`** must each be from 1 to 1000. Otherwise the error is `A whole number from 1 to 1000.`
- **Blank** counts as invalid.
- Collect every error. Return `{ ok: false, errors }` if there are any, otherwise the four numbers as `goals`.

Tests, one `it` each:
1. `parseGoals({ calories: '2000', protein: '150', carbs: '250', fat: '65' })` equals `{ ok: true, goals: { goal_calories: 2000, goal_protein_g: 150, goal_carbs_g: 250, goal_fat_g: 65 } }`.
2. `parseGoals({ calories: ' 2100 ', protein: '1', carbs: '1000', fat: '70' })` is ok, with `goal_calories` `2100`.
3. `parseGoals({ calories: '400', protein: '150', carbs: '250', fat: '65' })` equals `{ ok: false, errors: { calories: 'A whole number from 500 to 10000.' } }`.
4. `parseGoals({ calories: '2000', protein: '12.5', carbs: '', fat: '1001' })` equals `{ ok: false, errors: { protein: 'A whole number from 1 to 1000.', carbs: 'A whole number from 1 to 1000.', fat: 'A whole number from 1 to 1000.' } }`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 4. `src/household/GoalsCard.tsx` (new)
`export default function GoalsCard()`
- **Data:** `const { profile, refresh } = useProfile()` and `const { session } = useAuth()`. Render `null` while `profile` is missing.
- **The card:** `bg-slate-800 rounded-lg p-4 text-left space-y-3`.
- **Not editing:**
  - a header row with `Your daily goals` (semibold) and an `Edit` button (`text-sm text-blue-400`) on the right
  - then one line: `` `${profile.goal_calories} cal · ${profile.goal_protein_g} g protein · ${profile.goal_carbs_g} g carbs · ${profile.goal_fat_g} g fat` ``, in `text-sm text-gray-300`
- **Editing (after `Edit`):**
  - **state** `input: GoalInput`, filled from the profile with `String(...)`; `errors`; and `saving`
  - **a 2-column grid of four fields:** `Calories`, `Protein (g)`, `Carbs (g)` and `Fat (g)`. Each has a `<label htmlFor>`, an `<input type="text" inputMode="numeric">` with ids `goal-calories`, `goal-protein`, `goal-carbs` and `goal-fat`, and its error under it in `text-red-400 text-xs`. Use ProfileStep's input class.
  - **changing a field** clears that field's error
  - **`Save`** (blue, `flex-1`):
    1. run `parseGoals(input)`
    2. if it isn't ok, set `errors` and stop
    3. otherwise `update(goals)` on `profiles` `.eq('id', session!.user.id)`, then `await refresh()`, and go back to not editing
    4. a Supabase error shows its `message` in red, and the form stays open
  - **`Cancel`** (grey) goes back to not editing without saving
  - **while saving,** both buttons are disabled, and Save reads `Saving…`

### 5. Change `src/pages/Us.tsx`
Render `<GoalsCard />` inside the `{household && (...)}` block, right after the grid with the two people. Use `max-w-sm mx-auto` so it lines up with the rest. Change nothing else.

### Rules
- **Files:**
  - create only `src/household/goals.ts`, `src/household/goals.test.ts` and `src/household/GoalsCard.tsx`
  - change only the files named in steps 1, 2 and 5
- **Don't:**
  - run git commands, create `.env` files, or add packages
  - create any other files, including files for build output: read the build's output in the terminal
- **Writing:** write each new file in one write, then fix with small `edit`s. Keep JSX ternaries shallow.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 4. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors.
3. `grep -rnE "\} kcal|kcal (left|over|each|/)" src --include=*.tsx` prints nothing (before your change it prints 8 lines). **Paste what it prints**; an empty result is fine.
4. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.
