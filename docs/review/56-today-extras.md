# 56: Today extras (redesign)

Read `docs/review/redesign-common.md` first and follow it. Pure reskin of three components used on the Today screen.

## Files
`src/today/EditMealLog.tsx` (99 lines), `src/today/MoreNutrients.tsx` (37 lines), `src/menu/TodayMenu.tsx` (48 lines)

## Steps
1. **`EditMealLog.tsx`:** read it. Its panel (the inline editor that replaces a log row) becomes `bg-card rounded-3xl shadow-card p-4` with a `border border-coral` ring when open. Inputs use the input style, Save is the primary button, Cancel the secondary, Delete is `text-danger` (keep any confirm step as is).
2. **`MoreNutrients.tsx`:** read it. The toggle button becomes `text-link font-semibold`; the list rows `text-ink` with values `text-muted`; the container `bg-card rounded-3xl shadow-card p-4`.
3. **`TodayMenu.tsx`:** read it. Its title uses the section-title style. Each menu item row becomes a card row (`bg-card rounded-3xl shadow-card p-4 flex items-center justify-between gap-3`) with its Log button as a secondary button (`bg-coral-light text-link rounded-2xl font-semibold px-4 py-2`).

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for these three files.
- The reply format in `redesign-common.md`.
