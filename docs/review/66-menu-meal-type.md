# 66: Change the meal of a menu item

Read `docs/review/features-common.md` first and follow it.

## What and why
On Prep > Menu, tapping a filled meal opens the slot editor (`SlotEditor`). Today you can change the dish or clear it, but not move it to another meal (breakfast, lunch, dinner) on the same day. Add a Meal picker to the editor, shown only when the slot already has something in it.

## Files
`src/menu/SlotEditor.tsx` (162 lines), `src/pages/Prep.tsx` (199 lines; only the `<SlotEditor …/>` call near line 42)

## Steps
1. **`SlotEditor.tsx`:** add `takenMeals?: MenuMeal[]` to the props (meals that already have an item on this date; optional so nothing else breaks). Add state `const [mealPick, setMealPick] = useState<MenuMeal>(meal)`. Import `MENU_MEALS` from `./types`.
2. The heading uses `mealPick` instead of `meal` (`{dayLabel(date)} · {mealLabel(mealPick)}`).
3. When `slot` is set, show a "Meal" block between the heading and the dishes block: label `text-xs font-semibold uppercase text-muted mb-1`, then a row of three buttons from `MENU_MEALS`, each `aria-pressed={mealPick === m}`, `type="button"`, `disabled={anyPending}`, using the same pill style as the "Also put it on" day buttons (selected `bg-coral-deep text-white`, otherwise `bg-coral-light text-link`). Label with `mealLabel(m)`. If `mealPick !== meal` and `takenMeals?.includes(mealPick)`, show under the row `<p className="text-muted text-xs mt-1">{mealLabel(mealPick)} already has a meal. Saving replaces it.</p>`.
4. In `saveMutation`: save to `mealPick` instead of `meal` (the `saveSlot` call and the `copyRows` call both use `mealPick`). After the saves succeed, if `slot && mealPick !== meal`, call `await clearSlot(slot.id)` (so the item moves rather than copies). Keep the order: save first, clear after.
5. **`Prep.tsx`:** pass `takenMeals={(menu.data ?? []).filter(s => s.slot_date === slotEditing.date).map(s => s.meal)}` to `SlotEditor`.

## Done means
- Existing behaviour is unchanged when the slot is empty (no Meal block) or the meal is not changed.
- No new files. `npm test` is unaffected (Claude runs it).
- Reply as in `features-common.md`.
