# 57: Add food screens (redesign)

Read `docs/review/redesign-common.md` first and follow it. Pure reskin.

## Files
`src/pages/AddFood.tsx` (37 lines), `src/food/FoodFinder.tsx` (149 lines), `src/food/ServingPicker.tsx` (148 lines)

## Steps (one file at a time, one JSX block per edit)
1. **`AddFood.tsx`:** page heading and any links per the style rules.
2. **`FoodFinder.tsx`:** read it top to bottom. The search input uses the input style (`rounded-2xl`, a slightly larger `py-3.5`). Result rows become `bg-card rounded-3xl shadow-card p-4` with the food name `font-bold text-ink` and details `text-sm text-muted`. Tabs or filter chips (if any) are pills: selected `bg-coral-deep text-white rounded-full px-4 py-1.5`, unselected `bg-coral-light text-link rounded-full px-4 py-1.5`. Favourite stars and other small icon buttons keep their behaviour; color them `text-coral` when active and `text-muted` when not.
3. **`ServingPicker.tsx`:** read it. The serving amount input and unit select use the input style; the macro summary uses a card (`bg-card rounded-3xl shadow-card p-4`); the Log button is the primary button, Cancel the secondary. Keep the `NutritionLabel` element exactly as it is (task 58 does not touch it either: it stays black-on-white).

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for these three files.
- The reply format in `redesign-common.md`.
