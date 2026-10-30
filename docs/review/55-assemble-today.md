# 55: Assemble the Today screen (redesign)

Read `docs/review/redesign-common.md` first and follow it. Tasks 51–54 built `KcalRing`, `DayStrip`, `MealSection` (with the new `emptyAddHref` prop) and `MacroPills`. This task puts them together in `src/pages/Today.tsx`. **Change JSX and class names only. Keep every hook, state, mutation, handler, condition and text exactly as it is.**

## Files
`src/pages/Today.tsx` (147 lines). Read `src/today/KcalRing.tsx`, `DayStrip.tsx`, `MealSection.tsx`, `MacroPills.tsx` first for their props.

## Steps (do them in order; one edit each)
1. Add imports for `KcalRing`, `DayStrip`, `MacroPills`. Do not remove the `MacroBar` import yet if removing it would leave a type error; remove it only if nothing uses it afterwards.
2. **Top of the page.** Replace the row with the ‹ › buttons and the `<h1>` by: a flex row, `flex items-center justify-between`, with `<h1 className="rounded-full bg-coral-light px-4 py-2 text-sm font-semibold text-link">{dayTitle(date, today)}</h1>` on the left and, when `!isToday`, the existing "Back to today" button on the right restyled `text-sm font-semibold text-link underline`. The previous/next day buttons are removed (the strip replaces them). `goTo`, `prev` and the other logic stay.
3. **Ring.** In the block shown when `total` exists, render `<KcalRing consumed={total.kcal} goal={goals.kcal} />` centred. The old `{total.kcal} / {goals.kcal} cal` and `cal left` / `cal over` paragraphs are removed (the ring shows the same information).
4. **Strip.** Directly under the ring: `<DayStrip selected={date} today={today} onPick={goTo} />`.
5. **Macros.** Replace the three `MacroBar` elements by `<MacroPills protein={{ value: total.protein_g, goal: goals.protein_g }} carbs={{ value: total.carbs_g, goal: goals.carbs_g }} fat={{ value: total.fat_g, goal: goals.fat_g }} />`. Put it after the meal sections, not before. `MoreNutrients` stays, after the pills, in the same condition as now.
6. **Meals.** The meal sections stay mapped from `groups`. Pass `emptyAddHref={isToday ? '/add' : `/add?date=${date}`}` to each `MealSection`. Skip rendering the `snack` section when it has no logs (`g.meal === 'snack' && g.logs.length === 0`); breakfast, lunch and dinner always render.
7. **The big blue "Add food" link** becomes a floating button: replace it with `<div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 mx-auto flex max-w-md justify-end px-5"><Link to={…same href as before…} aria-label="Add food" className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-coral to-orange-300 text-3xl font-bold text-white shadow-[0_10px_24px_rgba(251,146,60,0.4)]">+</Link></div>`. The accessible name stays "Add food". This is the one place a gradient and `text-white` are allowed. The error branch also has an "Add food" link: give it the same floating button treatment, or the primary-button style from the common file if a floating one there would overlap the error card (your choice; say which).
8. **Everything else, reskinned only:** the error card (`bg-card rounded-3xl shadow-card p-6`, title `text-danger`, message `text-muted`, button primary), the loading text (`text-muted`), the Copy-previous-day button (`w-full py-3 rounded-2xl border-2 border-dashed border-line text-link font-semibold hover:bg-coral-light`, disabled state `text-muted`), the copy error (`text-danger`), spacing `space-y-5` on the page wrapper.
9. `TodayMenu` is reskinned by a later task. Leave its usage unchanged.

## Done means
- `npx tsc -b` passes; `npm test` passes with the same count as before.
- `grep -nE "slate-|gray-|blue-|red-|amber-|#[0-9a-fA-F]{3,6}" src/pages/Today.tsx` finds nothing.
- `git diff src/pages/Today.tsx` shows no change to any hook, `useMutation`, `queryClient`, `goTo`, `copyRows` or condition, other than the removal of unused imports and the new component props.
- The reply format in `redesign-common.md`.
