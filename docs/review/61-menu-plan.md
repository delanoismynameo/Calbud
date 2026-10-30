# 61: Menu and Plan (redesign)

Read `docs/review/redesign-common.md` first and follow it. Pure reskin.

## Files
`src/menu/MenuGrid.tsx` (53 lines), `src/menu/SlotEditor.tsx` (164 lines), `src/pages/Plan.tsx` (189 lines)

## Steps (one file at a time, one JSX block per edit)
1. **`MenuGrid.tsx`:** the week grid is a card (`bg-card rounded-3xl shadow-card p-3`); day headings `text-[11px] font-semibold uppercase text-muted`; each slot cell `rounded-2xl bg-coral-light/50 text-ink`, an empty slot `border-2 border-dashed border-line text-muted`; today's column header `text-link`.
2. **`SlotEditor.tsx`:** read it in chunks. The editor panel is a card; inputs in the input style; the Copy to other days day buttons are pills (selected `bg-coral-deep text-white`, unselected `bg-coral-light text-link`); Save is the primary button, Cancel the secondary, Clear is `text-danger`.
3. **`Plan.tsx`:** read it in chunks. Titles in the section-title style, week navigation as in task 59 (`h-10 w-10 rounded-2xl bg-card shadow-card`), each day/activity block a card, any Repeat last week button secondary.

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for these three files.
- The reply format in `redesign-common.md`.
