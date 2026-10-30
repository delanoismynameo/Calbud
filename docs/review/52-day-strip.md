# 52: Day strip (redesign)

Read `docs/review/redesign-common.md` first and follow it. This builds the row of five days that goes under the ring on Today and replaces the ‹ › arrows: a pure helper with tests, then the component. Not wired into Today yet (task 55).

## Files
New: `src/today/dayStrip.ts`, `src/today/dayStrip.test.ts`, `src/today/DayStrip.tsx`

## Steps
1. **`dayStrip.ts`:**
```ts
export interface StripDay { date: string; dow: string; dom: number; isSelected: boolean; isFuture: boolean }
export function stripDays(selected: string, today: string): StripDay[]
```
Returns 5 days: `selected` minus 2 through plus 2, using `addDays` from `../prep/week` (dates are `YYYY-MM-DD` strings). `dow` is `Sun`…`Sat` from a local array indexed by `new Date(y, m - 1, d).getDay()` (parse the string by splitting on `-`; do not use `new Date(string)`). `dom` is the day of the month as a number. `isSelected` is true for the middle one. `isFuture` is `date > today` (plain string comparison is right for this format).
2. **`dayStrip.test.ts`:** 5 entries in order; the middle is selected; selected = today means the last two are future and the first three are not; selected two days before today means none are future; a month boundary (selected `2026-10-31` gives dates `2026-10-29` to `2026-11-02` and doms 29, 30, 31, 1, 2); a year boundary (selected `2026-01-01`); the dow names for a known date (`2026-10-29` is a Thursday).
3. **`DayStrip.tsx`:** `export default function DayStrip({ selected, today, onPick }: { selected: string; today: string; onPick: (date: string) => void })`. A `div` with `flex justify-between px-1 my-4`. Each day is a `<button type="button">` with `flex h-16 w-[52px] flex-col items-center justify-center gap-1 rounded-2xl`: the day name in `text-[11px] font-medium uppercase text-muted`, the number in `text-base font-bold text-ink`. The selected day has `bg-coral-light` and both texts `text-link`, and `aria-current="date"`. Future days are `disabled` with `opacity-40`. Each button has `aria-label` set to its date string. Clicking calls `onPick(date)`.

## Done means
- `npx tsc -b` passes; `npm test` passes with the new dayStrip tests added to the previous count.
- The reply format in `redesign-common.md`.
