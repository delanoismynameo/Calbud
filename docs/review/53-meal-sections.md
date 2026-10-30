# 53: Meal sections (redesign)

Read `docs/review/redesign-common.md` first and follow it. Restyle `MealSection` as the mockup's meal block: a caps title, white cards, an icon tile and a kcal pill.

## Files
`src/today/MealSection.tsx` (51 lines today)

## Steps
1. Add one **optional** prop `emptyAddHref?: string`. All existing props and behaviour stay.
2. The outer element stops being a card: it becomes `<section className="space-y-3">` with no background. The header row: the `<h2>` in `text-[13px] font-bold uppercase tracking-[1.5px] text-section` (keep `MEAL_LABELS[meal]`; drop `capitalize` and `text-lg`), and the total `{sumLogs(logs).kcal} cal` right-aligned in `text-muted text-sm`.
3. Each log row (the `<button>`): `w-full text-left bg-card rounded-3xl shadow-card p-4 flex items-center gap-3.5 hover:bg-coral-light`. Left: an icon tile `h-14 w-14 shrink-0 rounded-2xl bg-coral-light flex items-center justify-center text-2xl` with an emoji by meal (add a `MEAL_ICONS: Record<MealType, string>` next to `MEAL_LABELS`: breakfast 🍳, lunch 🥗, dinner 🍽️, snack 🍎; the tile has `aria-hidden`). Middle (`min-w-0 flex-1`): the name in `font-bold text-base text-ink truncate`, the quantity in `text-[13px] text-muted`. Right: the kcal as a pill `rounded-xl bg-coral-light px-2.5 py-1.5 text-[15px] font-extrabold text-link whitespace-nowrap`; its text stays `{Math.round(log.kcal)} cal`. Keep the `EditMealLog` usage exactly as it is.
4. Empty state: when `logs.length === 0` and `emptyAddHref` is given, render a react-router `<Link to={emptyAddHref}>` styled as the mockup's dashed row: `flex h-[72px] items-center justify-center rounded-3xl border-2 border-dashed border-line text-muted font-semibold` with the text `+ Add food`. When `emptyAddHref` is not given, keep the existing `Nothing logged.` paragraph, in `text-muted text-sm`.

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for `MealSection.tsx`. The only new strings allowed are `+ Add food` and the four emoji.
- The reply format in `redesign-common.md`.
