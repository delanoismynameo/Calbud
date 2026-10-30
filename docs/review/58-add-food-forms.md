# 58: Add food forms and scanner (redesign)

Read `docs/review/redesign-common.md` first and follow it. Pure reskin.

## Files
`src/food/CustomFoodForm.tsx` (204 lines), `src/food/ExtrasFields.tsx` (70 lines), `src/food/RecipeBuilder.tsx` (169 lines), `src/food/BarcodeScanner.tsx` (100 lines)

**Do not touch `src/food/NutritionLabel.tsx`.** The Nutrition Facts label stays black on white in both themes. Where these forms render it, leave that element alone.

## Steps (one file at a time, one JSX block per edit; read each file in chunks of about 100 lines)
1. **`ExtrasFields.tsx`:** labels `text-muted text-sm`, inputs in the input style.
2. **`CustomFoodForm.tsx`:** the form sits on the page (no card needed) but each group of fields can be a card `bg-card rounded-3xl shadow-card p-4 space-y-3`. The Type the numbers / Build from ingredients switch is a segmented control like the one in `src/ui/ThemeToggle.tsx` if that file exists (selected `bg-card text-ink shadow-card rounded-xl font-bold`, track `bg-coral-light rounded-2xl p-1`), otherwise the same classes written inline. Save is the primary button.
3. **`RecipeBuilder.tsx`:** ingredient rows are `bg-coral-light/50 rounded-2xl p-3`, the add-ingredient controls use the input and secondary-button styles, the totals use a card.
4. **`BarcodeScanner.tsx`:** the camera view keeps a dark backdrop on purpose (`bg-black` is allowed here, only for the video frame), the controls around it follow the button and input styles, error text `text-danger`.

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for these four files (`bg-black` on the video frame is the one allowed exception).
- The reply format in `redesign-common.md`.
