# 72: Dark mode for the Nutrition Facts label

Read `docs/review/features-common.md` first and follow it. Ignore its line about the `redesign` branch: stay on whatever branch is checked out, and do not commit.

## What and why
`src/food/NutritionLabel.tsx` is hard-coded white with black text and black rules (`bg-white text-black`, `border-black`, `border-gray-400`, `text-gray-500`). In dark mode it glares. Make it follow the theme: in light mode it must look exactly as it does now; in dark mode the colours invert (dark card, light text, light rules). Do this with the colour token classes only, so no `dark:` variants.

## Files
`src/food/NutritionLabel.tsx` (only this file)

## Steps
1. In the outer `<div>` change `bg-white text-black` to `bg-card text-ink`, and `border-black` to `border-ink`. Keep `rounded p-3 border-2`.
2. Replace every other `border-black` in the file with `border-ink` (the heading rule, the serving line `border-b-8`, the Calories `border-b-4`, the "% Daily Value" header rule, and both thick bars before and inside the vitamins group). Keep the border widths.
3. In `RowContent` change `border-gray-400` to `border-muted`.
4. In `RowContent` change both `text-gray-500` classes (the "(N without data)" note and the "no data" text) to `text-muted`.
5. Leave the markup, text, props, row logic and every other class unchanged.

## Done means
- `grep -n "black\|white\|gray-" src/food/NutritionLabel.tsx` finds nothing.
- Only that one file changed.
- Reply as in `features-common.md`.
