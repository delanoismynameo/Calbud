# 54: Macro pills (redesign)

Read `docs/review/redesign-common.md` first and follow it. Build the three macro tiles from the mockup (Protein, Carbs, Fat). Not wired into Today yet (task 55). Do not edit or delete `MacroBar.tsx`.

## Files
New: `src/today/MacroPills.tsx`. Read `src/today/MacroBar.tsx` first to see the current props and the `progress` helper in `src/today/totals.ts`.

## Steps
1. **`MacroPills.tsx`:** `export default function MacroPills({ protein, carbs, fat }: { protein: { value: number; goal: number }; carbs: { value: number; goal: number }; fat: { value: number; goal: number } })`.
2. Layout: `<div className="grid grid-cols-3 gap-3 my-2">` with three tiles. Each tile: `flex flex-col items-center justify-center gap-1 rounded-3xl shadow-card px-2 py-4 min-h-24`, with these tints (all token classes): Protein `bg-rose-soft`, value text `text-rose-ink`, emoji 🥩; Carbs `bg-amber-soft`, `text-amber-ink`, emoji 🍞; Fat `bg-green-soft`, `text-green-ink`, emoji 🥑.
3. Tile content, top to bottom: the value line `{emoji} {Math.round(value)}g` in `text-base font-extrabold`; the label (`Protein`, `Carbs`, `Fat`) in `text-[11px] font-semibold uppercase text-muted`; and, only when `goal > 0`, a small line `of {goal} g` in `text-[11px] text-muted`. When `value > goal && goal > 0`, the value line uses `text-warn`.
4. Under the value line, a thin progress bar so the goal is still visible: `h-1.5 w-full rounded-full bg-ring-track overflow-hidden` with an inner `h-full rounded-full bg-ring` (use `bg-warn` when over) and `style={{ width: `${progress(value, goal)}%` }}`. Keep the same `role="progressbar"`, `aria-label`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes that `MacroBar` has, on the bar. Only render the bar when `goal > 0`.

## Done means
- `npx tsc -b` passes; `npm test` passes with the same count as before.
- `grep -nE "slate-|gray-|blue-|red-|amber-|text-white|#[0-9a-fA-F]{3,6}" src/today/MacroPills.tsx` finds nothing. (The token names `bg-amber-soft` and `text-amber-ink` are allowed.)
- The reply format in `redesign-common.md`.
