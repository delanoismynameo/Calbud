# 51: Kcal ring (redesign)

Read `docs/review/redesign-common.md` first and follow it. This builds the green progress ring for the top of the Today screen: a pure helper with tests, then a presentational component. It is not wired into Today yet (task 55 does that).

## Files
New: `src/today/ringMath.ts`, `src/today/ringMath.test.ts`, `src/today/KcalRing.tsx`

## Steps
1. **`ringMath.ts`:** `export function ringDash(consumed: number, goal: number, circumference: number): { offset: number; over: boolean }`. `fraction` is `consumed / goal` clamped to 0–1, and is 0 when `goal <= 0`, when either input is not finite, or when `consumed < 0`. `offset = circumference * (1 - fraction)`. `over` is true only when `goal > 0 && consumed > goal`.
2. **`ringMath.test.ts`** (vitest, like the other `*.test.ts` files in `src/today`): consumed 0 gives the full circumference; half of goal gives half the circumference; exactly the goal gives offset 0 and over false; above the goal gives offset 0 and over true; goal 0 gives an empty ring (offset equals the circumference) and over false; negative consumed gives an empty ring; NaN consumed gives an empty ring.
3. **`KcalRing.tsx`:** `export default function KcalRing({ consumed, goal }: { consumed: number; goal: number })`.
   - Outer wrapper: `relative mx-auto flex h-[180px] w-[180px] items-center justify-center rounded-full bg-coral-light shadow-card`, with `role="img"` and an `aria-label` such as `1,135 cal left` (same text as shown).
   - Inside, an SVG `width={160} height={160} viewBox="0 0 160 160"` with `aria-hidden`, absolutely centred (`absolute`): a track `<circle cx={80} cy={80} r={72} fill="none" strokeWidth={14} className="stroke-ring-track" />`, then the progress `<circle>` with the same centre and radius, `fill="none"`, `strokeWidth={10}`, `strokeLinecap="round"`, `strokeDasharray={C}`, `strokeDashoffset={offset}` where `C = 2 * Math.PI * 72`, `transform="rotate(-90 80 80)"`, `className` `stroke-ring` (or `stroke-warn` when `over`) and `style={{ transition: 'stroke-dashoffset 0.4s' }}`.
   - Centre text, `relative` so it is above the SVG, centred: the number in `text-5xl font-extrabold tracking-tight leading-none text-ink` (`text-warn` when over), and below it a label in `text-[13px] font-semibold uppercase tracking-wide text-muted mt-1`.
   - The number is `Math.abs(goal - consumed)` formatted with `toLocaleString()`. The label is `cal left` when at or under the goal, `cal over` when over. When `goal <= 0`, show `consumed` and the label `cal eaten`.

## Done means
- `npx tsc -b` passes; `npm test` passes with the new ringMath tests added to the previous count.
- The reply format in `redesign-common.md`.
