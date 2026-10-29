# 40: The "This week" card on the Us page

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app where two people in a household log food. The Us page (`src/pages/Us.tsx`) shows the two people and their goals. Add a **This week** card: for each person, today's calories against their goal and their 7-day average, plus the household's **shared streak** (days in a row both people ended within 10% of their calorie goal).

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Write the code carefully and check it by reading. The reviewer runs the type check, `npm test` and `npm run build` after you finish.

### Already done (don't redo)
- **`src/dashboard/stats.ts`:** `ByDay`, `lastWeek(today)`, `averageKcal(byDay, dates)`, `streak(people, today, maxDays)`.
- **`src/dashboard/useHouseholdKcal.ts`:** `useHouseholdKcal(today)` gives a query whose `data` is `Record<userId, ByDay>` for the last 60 days.
- **`src/lib/useLocalDate.ts`:** `useLocalDate()` gives today as `'YYYY-MM-DD'`.
- **`src/household/useProfile.ts`:** `useProfile()` gives `profile` and `partner` (each has `id`, `display_name`, `color`, `goal_calories`; `partner` can be null).

### Read only these files
- This file.
- `src/dashboard/stats.ts`, `src/dashboard/useHouseholdKcal.ts`, `src/lib/useLocalDate.ts` (only its signature), `src/pages/Us.tsx`.
- The first 20 lines of `src/dashboard/stats.test.ts`, for the test style.

### 1. `src/dashboard/streakText.ts` (new)
```ts
// The streak line. `together` is true when there is a partner.
//  n >= 60 shows as '60+' (only 60 days are loaded).
export function streakText(n: number, together: boolean): string
```
| n | together | text |
|---|---|---|
| 0 | true | `No streak yet. Both finish a day within 10% of your goals to start one.` |
| 0 | false | `No streak yet. Finish a day within 10% of your goal to start one.` |
| 1 | true | `1 day in a row, both within 10% of your goals.` |
| 3 | true | `3 days in a row, both within 10% of your goals.` |
| 1 | false | `1 day in a row within 10% of your goal.` |
| 2 | false | `2 days in a row within 10% of your goal.` |
| 60 | true | `60+ days in a row, both within 10% of your goals.` |
| 75 | false | `60+ days in a row within 10% of your goal.` |

### 2. `src/dashboard/streakText.test.ts` (new)
One `it` per row of the table above, each checking the exact text. **Never change a test's expected value to make it pass.**

### 3. `src/dashboard/WeekCard.tsx` (new)
```tsx
export default function WeekCard()
```
- **Hooks first, all of them, before any early return:** `useProfile()`, `useLocalDate()`, `useHouseholdKcal(today)`. **No `useMemo` or `useCallback`.**
- Render `null` while `profile` is missing.
- `people` is `[profile]`, plus `partner` when there is one.
- **Card:** `bg-slate-800 rounded-lg p-4 text-left space-y-3`, heading `This week` in `text-sm font-semibold text-gray-400`.
- **While loading:** `Loading…` in `text-gray-400 text-sm`. **On error:** the error's `message` in `text-red-400 text-sm`, and nothing else in the card.
- **When loaded,** one block per person:
  - a line with a `w-3 h-3 rounded-full inline-block mr-2` dot in their `color`, then their `display_name` in `font-semibold`.
  - `Today: ${kcalToday} / ${goal_calories} cal`, where `kcalToday` is `data[person.id]?.[today] ?? 0`, in `text-sm`.
  - `7-day average: ${avg} cal` when `averageKcal(data[person.id], lastWeek(today))` is a number, otherwise `No food logged this week`, in `text-sm text-gray-400`.
- **Then** the streak line in `text-sm`: `streakText(n, people.length > 1)`, where `n = streak(people.map((p) => ({ byDay: data[p.id], goal: p.goal_calories })), today, 60)`.
- Work out the per-person values in plain variables or a small helper function before the JSX. Keep JSX ternaries shallow.

### 4. `src/pages/Us.tsx`
- Inside the `household &&` block, right after the two-person grid (the `grid grid-cols-2 gap-3` div) and before the `GoalsCard` wrapper, add `<div className="max-w-sm mx-auto"><WeekCard /></div>`. Add the import. Change nothing else.

### Rules
- **Files:**
  - create only `src/dashboard/streakText.ts`, `src/dashboard/streakText.test.ts` and `src/dashboard/WeekCard.tsx`
  - change only `src/pages/Us.tsx`
  - **never edit any file under `docs/`**, and do not change `src/dashboard/stats.ts` or `src/dashboard/useHouseholdKcal.ts`
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Import and use the existing helpers; do not write a second copy of anything that already exists. Use `import type` for types.

### Done when
1. The files above are written as described.
2. You have re-read this brief and checked every row of the table against your code by hand.

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, headless in the workspace-write sandbox (no npm).
- **Wall time:** about **2 min**, 10 steps. It stayed inside the brief's files. Its final reply was cut off mid-sentence, but the `Us.tsx` edit was in place.

## Result
- **Type check:** clean. **Tests:** 352 passing (344 + 8). **Build:** clean.
- **Click-through** at 375 px against the mock, after my fix:
  - **Today and the average:** "This week" shows alice at 259 / 2000 cal with a 7-day average of 450 cal (259 today and 640 yesterday), and Bob at 900 / 2000, average 900.
  - **Streak:** the line reads "No streak yet. Both finish a day within 10% of your goals to start one."
- **Not tested here:** a real streak above 0. The mock can't add the partner's logs. The streak logic is covered by task 39's tests.

## What I changed
- **Hook order:** `WeekCard` called `useLocalDate`, `useHouseholdKcal` and a second `useProfile` *after* `if (!profile) return null` and after the loading and error returns. React would crash once the profile or the data loaded. The brief said "hooks first, all of them", in bold. I rewrote it with the three hooks at the top, one card wrapper, and a single body for loading, error or data.
- **People list:** it copied each profile's fields into a new object. It now uses the profiles directly.

## Verdict
Usable after a rewrite of one component. The hook-after-return mistake came back for the third time (tasks 30, 34, 40), even with a bold rule. Next time, put the first lines of the component in the brief as code (the three hook calls, then the guard), so it starts from the right shape.
