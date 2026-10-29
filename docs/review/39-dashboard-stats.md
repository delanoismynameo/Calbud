# 39: Dashboard numbers (weekly average and a shared streak): logic, data and hook

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript app where two people in a household log food. The Us page will get a small dashboard (next task): each person's average calories over the last 7 days, and a **shared streak**, the number of days in a row both people ended the day within 10% of their calorie goal. This task is **only the logic, the data fetch and the hook**, with tests. No screen.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Write the code carefully and check it by reading. The reviewer runs the type check, `npm test` and `npm run build` after you finish.

### Already done (don't redo)
- **`src/prep/week.ts`:** `addDays(date, n)` for `'YYYY-MM-DD'` dates. Use it for every date step.
- **`src/today/mealLogApi.ts`:** how the app reads `meal_logs` with `supabase` (follow its error handling: `if (error) throw new Error(error.message)`).
- **`src/today/useMealLogs.ts`:** the hook style (TanStack Query, `useAuth`).
- **The database** already lets a household member read the partner's `meal_logs` rows, so one query gets both people.

### Read only these files
- This file.
- `src/prep/week.ts` (only `addDays`), `src/today/mealLogApi.ts` (only `fetchMealLogs`), `src/today/useMealLogs.ts`.
- The first 20 lines of `src/today/totals.test.ts`, for the test style.

### 1. `src/dashboard/stats.ts` (new)
```ts
export interface KcalRow { user_id: string; logged_on: string; kcal: number }
export type ByDay = Record<string, number>   // date → that day's kcal

// Per user, per date: the summed kcal, each sum rounded with Math.round at the end.
export function kcalByUserDay(rows: KcalRow[]): Record<string, ByDay>

// The 7 dates ending at `today`, oldest first: addDays(today, -6) … today.
export function lastWeek(today: string): string[]

// The average kcal over those `dates` that have an entry in `byDay`, rounded with Math.round. null when none has one, or byDay is undefined.
export function averageKcal(byDay: ByDay | undefined, dates: string[]): number | null

// On target: kcal is not undefined and Math.abs(kcal - goal) <= goal * tolerance.
export function onTarget(kcal: number | undefined, goal: number, tolerance = 0.1): boolean

// Days in a row, counting back, on which every person was on target (default tolerance).
// Start at `today` if everyone is on target today; otherwise start at addDays(today, -1), because today isn't over yet.
// Stop at the first day on which someone isn't on target, or once maxDays days have been counted.
// An empty `people` list gives 0.
export function streak(people: { byDay: ByDay | undefined; goal: number }[], today: string, maxDays: number): number
```

### 2. `src/dashboard/stats.test.ts` (new): one `it` each
1. `kcalByUserDay([{ user_id: 'a', logged_on: '2026-10-29', kcal: 100 }, { user_id: 'a', logged_on: '2026-10-29', kcal: 50.4 }, { user_id: 'b', logged_on: '2026-10-28', kcal: 300 }])` equals `{ a: { '2026-10-29': 150 }, b: { '2026-10-28': 300 } }`; `kcalByUserDay([])` equals `{}`.
2. `lastWeek('2026-10-29')` equals `['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']`; `lastWeek('2026-11-02')[0]` is `'2026-10-27'`.
3. `averageKcal({ '2026-10-28': 2000, '2026-10-29': 1500, '2026-10-01': 9999 }, lastWeek('2026-10-29'))` is `1750` (the October 1 entry is outside the week).
4. `averageKcal(undefined, lastWeek('2026-10-29'))` and `averageKcal({}, lastWeek('2026-10-29'))` are both `null`; `averageKcal({ '2026-10-28': 1001, '2026-10-29': 1000 }, lastWeek('2026-10-29'))` is `1001`.
5. `onTarget`: `(2100, 2000)` true, `(2200, 2000)` true, `(2201, 2000)` false, `(1800, 2000)` true, `(1799, 2000)` false, `(undefined, 2000)` false, `(2300, 2000, 0.2)` true.
6. `streak`: me `{ '2026-10-27': 2000, '2026-10-28': 2100, '2026-10-29': 2000 }` goal 2000, partner `{ '2026-10-27': 2500, '2026-10-28': 2400, '2026-10-29': 1000 }` goal 2500, today `'2026-10-29'`, maxDays 60 → `2` (today the partner is off target, so it counts the 28th and the 27th, and the 26th has no food).
7. The same, but the partner's `'2026-10-29'` is `2500` → `3`.
8. One person only: `{ '2026-10-29': 2000 }` → `1`; `{ '2026-10-28': 2000 }` (nothing today yet) → `1`; `{}` → `0`; `undefined` → `0`. Goal 2000, today `'2026-10-29'`, maxDays 60.
9. One person on target for each of the 10 days ending at `'2026-10-29'`, maxDays `5` → `5`.
10. `streak([], '2026-10-29', 60)` → `0`.

**Never change a test's expected value to make it pass.** If you think a value here is wrong, say so in your reply and leave the test as written.

### 3. `src/dashboard/kcalApi.ts` (new)
```ts
// The household's meal_logs rows (only user_id, logged_on, kcal) with logged_on from `from` to `to`, both included.
export async function fetchHouseholdKcal(from: string, to: string): Promise<KcalRow[]>
```
`supabase.from('meal_logs').select('user_id, logged_on, kcal').gte('logged_on', from).lte('logged_on', to)`. The database already limits the rows to the household; do not filter by user. Return `data ?? []`.

### 4. `src/dashboard/useHouseholdKcal.ts` (new)
```ts
// The last 60 days (addDays(today, -59) to today) of household kcal, grouped with kcalByUserDay.
export function useHouseholdKcal(today: string)
```
- `useQuery` with `queryKey: ['meal-logs', 'household', from, today]` (it starts with `'meal-logs'` so logging food, which already invalidates `['meal-logs']`, refreshes it too), `enabled: !!session`, and `queryFn: async () => kcalByUserDay(await fetchHouseholdKcal(from, today))`.
- `session` comes from `useAuth()`, as in `useMealLogs`.

### Rules
- **Files:** create only `src/dashboard/stats.ts`, `src/dashboard/stats.test.ts`, `src/dashboard/kcalApi.ts` and `src/dashboard/useHouseholdKcal.ts`. Change no existing file. **Never edit any file under `docs/`.**
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Use `addDays`; do not write your own date arithmetic. Use `import type` for types. Keep each function small.

### Done when
1. The four files exist as described.
2. You have re-read this brief and checked every test's expected value against your code by hand (you cannot run the tests).

Reply with: the files created, and anything you were unsure about. Report only what you actually did.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, headless in the workspace-write sandbox (no npm).
- **Wall time:** about **3 min**, 7 steps. It stayed inside the brief's files.
- **Outcome:** finished, and it reported "no uncertainties or deviations".

## Result
- **Type check:** clean. **Tests:** 344 passing (328 + 16) after my fix. Before it, 1 failed: the `maxDays` test didn't match the brief.

## What I changed
- **The `maxDays` test:** it built 10 people whose dates were `'21'`–`'30'`, not one person on target for the 10 dates ending on 2026-10-29. I rewrote it as briefed, using `addDays`. The code was right.
- **`kcalByUserDay`:** it rounded after each added row. It now rounds each day's sum once, as briefed. With many fractional rows, rounding every step can drift.
- **`streak`:** it had two copies of the "everyone on target" loop. It now uses one `everyone(date)` helper and a `while` loop.

## Verdict
Usable after small fixes. It said it hand-checked test 9, but the test it wrote doesn't test what the brief said. As in task 09, its self-report about tests can't be trusted.
