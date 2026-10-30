# 63: Us cards (redesign)

Read `docs/review/redesign-common.md` first and follow it. Pure reskin of the cards on the Us page.

## Files
`src/household/YouCard.tsx` (139 lines), `src/household/GoalsCard.tsx` (131 lines), `src/household/DataCard.tsx` (97 lines), `src/dashboard/WeekCard.tsx` (50 lines), `src/household/SwitchHousehold.tsx` (50 lines), `src/household/CopyCode.tsx` (30 lines)

## Steps (one file at a time, one JSX block per edit; read the bigger files in chunks)
1. Each card's outer element becomes `bg-card rounded-3xl shadow-card p-5` with its title in the section-title style.
2. Fields in the input style; labels `text-sm text-muted`; Save buttons primary; secondary actions secondary; error text `text-danger`; success text `text-link`.
3. **`YouCard.tsx`:** the colour picker swatches keep their own colours (they come from `src/household/colors.ts`), so inline `style` colours there are allowed. Selected swatch: `ring-2 ring-offset-2 ring-coral`.
4. **`WeekCard.tsx`:** the streak and averages text `text-ink` / `text-muted`; any bar uses `bg-ring` on `bg-ring-track`.
5. **`CopyCode.tsx`:** the code in `font-mono text-ink bg-coral-light rounded-2xl px-3 py-2`.

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for these six files (inline `style` colours in `YouCard.tsx` are the one allowed exception).
- The reply format in `redesign-common.md`. If you ran out of room, say which files are done.
