# 73: Tap a profile on the Us tab to see their food and macros

Read `docs/review/features-common.md` first and follow it. Ignore its line about the `redesign` branch: stay on whatever branch is checked out, and do not commit.

## What and why
On the Us tab the two profile tiles (you and your partner) are plain boxes. Make each one tappable. Tapping a tile opens a **read-only day view** of that person: their calories ring, a strip to pick the day, their meals for that day, their macros against their own goals, and the "more nutrients" block. A "‹ Back" button returns to the Us page. The database already lets household members read each other's `meal_logs` (policy `meal_logs_select_household`), so **no SQL is needed**.

## Files
`src/household/PersonDay.tsx` (new), `src/today/MealSection.tsx`, `src/pages/Us.tsx`

## Steps
1. **`src/today/MealSection.tsx`:** add an optional prop `readOnly?: boolean` (add it to the props type and the destructuring, default false). When `readOnly` is true:
   - each log renders as a `<div>` with the **same classes as the current button except** `hover:bg-coral-light` and `text-left`/`w-full` are kept as they are; it has no `onClick`, and `EditMealLog` is never shown;
   - an empty meal shows `<p className="text-muted text-sm">Nothing logged.</p>` (the existing `emptyAddHref` branch is skipped).
   When `readOnly` is false the component behaves exactly as now. Change nothing else in the file.
2. **`src/household/PersonDay.tsx` (new, write it in two chunks):** a default export component with props `{ person: Profile; onBack: () => void }` (`import type { Profile } from '../lib/types'`).
   - `const today = useLocalDate()` (from `'../lib/useLocalDate'`) and `const [date, setDate] = useState(today)`.
   - Load their logs with `useQuery({ queryKey: ['meal-logs', person.id, date], queryFn: () => fetchMealLogs(person.id, date) })` (`useQuery` from `@tanstack/react-query`, `fetchMealLogs` from `'../today/mealLogApi'`). Do not use `useMealLogs`: it is hard-wired to the signed-in user.
   - `total = sumLogs(logs.data ?? [])` and `groups = groupByMeal(logs.data ?? [])`, both from `'../today/totals'`.
   - Goals come from **`person`**, not the signed-in user: `kcal: person.goal_calories ?? 0`, `protein_g: person.goal_protein_g ?? 0`, `carbs_g: person.goal_carbs_g ?? 0`, `fat_g: person.goal_fat_g ?? 0`.
   - Layout, top to bottom, inside `<div className="space-y-5 text-left">`:
     a. A row with a `‹ Back` button (`type="button"`, `onClick={onBack}`, classes `text-sm font-semibold text-link`) and, on the right, the person's coloured dot (`<span className="w-3 h-3 rounded-full" style={{ backgroundColor: person.color }} />`) next to `<h1 className="text-lg font-extrabold text-ink">{person.display_name}</h1>`.
     b. A day title line `<p className="text-sm font-semibold text-link">{dayTitle(date, today)}</p>` (`dayTitle` from `'../today/day'`).
     c. If `logs.isError`: a card `bg-card rounded-3xl shadow-card p-6 text-center` with `<p className="text-danger font-semibold">Couldn't load their food.</p>` and the error message in `text-muted text-sm`; stop there (nothing below).
     d. If `logs.isPending`: `<p className="text-muted text-center py-8">Loading…</p>`. Otherwise: `<KcalRing consumed={total.kcal} goal={goals.kcal} />` and `<DayStrip selected={date} today={today} onPick={setDate} />`, then a `MealSection` for each group exactly like `src/pages/Today.tsx` does (skip an empty `snack` group), but with `readOnly` and **no** `emptyAddHref`, then `<MacroPills protein={{ value: total.protein_g, goal: goals.protein_g }} carbs={{ value: total.carbs_g, goal: goals.carbs_g }} fat={{ value: total.fat_g, goal: goals.fat_g }} />`, then `{logs.data.length > 0 && <MoreNutrients logs={logs.data} />}`.
   - Copy the import paths and prop names for `KcalRing`, `DayStrip`, `MealSection`, `MacroPills`, `MoreNutrients` from `src/pages/Today.tsx`. No "Add food", no "Copy yesterday", no menu, no editing anything.
3. **`src/pages/Us.tsx`:**
   - `import { useState } from 'react'` and `import PersonDay from '../household/PersonDay'`. Add `const [viewing, setViewing] = useState<'me' | 'partner' | null>(null)` at the top of the component (before any return).
   - After the hooks, if `viewing` is set and the matching person exists (`profile` for `'me'`, `partner` for `'partner'`), return `<PersonDay person={person} onBack={() => setViewing(null)} />` instead of the normal page.
   - Turn the two tiles in the `grid grid-cols-2` into `<button type="button" onClick={() => setViewing('me')} ...>` and `... 'partner'`, keeping every class they have now and adding `w-full`. The partner tile is only a button when `partner` exists: while it shows "Waiting…" leave it a plain `div`.
   - Add a small hint under the grid: `<p className="text-xs text-muted">Tap a profile to see their day.</p>` shown only when `partner` exists.
   - Change nothing else on the page.

## Done means
- Only those three files changed (one new, two edited).
- No `any`, no unused imports, no `dark:` variants, token colours only (the profile dot's inline `style` colour is the one allowed exception).
- `npx tsc -b` and `npm test` pass (Claude runs them).
- Reply as in `features-common.md`.
