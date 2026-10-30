# 60: Prep form (redesign)

Read `docs/review/redesign-common.md` first and follow it. Pure reskin of one big file. **It is 367 lines: do not rewrite it. Make one small edit per JSX block, top to bottom, and run `npx tsc -b` after every three edits.**

## Files
`src/prep/PrepForm.tsx` only.

## Steps
1. Read the file in chunks of about 100 lines, and write down the groups in the form (name/date, ingredients, nutrients, buttons, and so on). Do not edit while reading.
2. Go through the groups top to bottom. For each group, change only the className strings, using the style rules: group wrapper a card (`bg-card rounded-3xl shadow-card p-4 space-y-3`), labels `text-sm text-muted`, inputs/selects/textareas in the input style, the Type the numbers / Build from ingredients switch (if it is in this file) a segmented control (track `bg-coral-light rounded-2xl p-1`, selected `bg-card text-ink shadow-card rounded-xl font-bold`), ingredient rows `bg-coral-light/50 rounded-2xl p-3`, validation messages `text-danger text-sm`.
3. The Save/Add button is the primary button; Cancel is the secondary; Delete is `text-danger`.
4. Leave the `NutritionLabel` / label preview element exactly as it is.
5. Run the "Done means" checks.

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for `PrepForm.tsx`.
- The reply format in `redesign-common.md`. If you ran out of room before the last group, say which groups are done.
