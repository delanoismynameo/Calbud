# 59: Prep screens (redesign)

Read `docs/review/redesign-common.md` first and follow it. Pure reskin.

## Files
`src/pages/Prep.tsx` (202 lines), `src/prep/GroceryList.tsx` (147 lines), `src/prep/RepeatButton.tsx` (76 lines)

## Steps (one file at a time, one JSX block per edit; read each file in chunks of about 100 lines)
1. **`Prep.tsx`:** the page title and the Menu / Prep tabs (if present) use the segmented-control look (track `bg-coral-light rounded-2xl p-1`, selected `bg-card text-ink shadow-card rounded-xl font-bold`). Week navigation buttons: `h-10 w-10 rounded-2xl bg-card shadow-card text-ink`. Each prep session is a card with the Planned / Done state as a pill (`rounded-full px-3 py-1 text-xs font-bold`; Planned `bg-coral-light text-link`, Done `bg-green-soft text-green-ink`).
2. **`GroceryList.tsx`:** the list is a card; each row has a checkbox with `accent-coral-deep`; ticked rows are `text-muted line-through`. The Send to Keep button is the secondary button.
3. **`RepeatButton.tsx`:** secondary button; any confirm text uses `text-muted`.

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for these three files.
- The reply format in `redesign-common.md`.
