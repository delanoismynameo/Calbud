# 62: Plan extras and the Us page (redesign)

Read `docs/review/redesign-common.md` first and follow it. A reskin, plus one small addition: the Appearance card on the Us page.

## Files
`src/activities/ActivityForm.tsx` (140 lines), `src/activities/ExportButton.tsx` (75 lines), `src/pages/Us.tsx` (83 lines)

## Steps (one file at a time, one JSX block per edit)
1. **`ActivityForm.tsx`:** read it in chunks. Fields in the input style, the form in a card, Save primary, Cancel secondary, Delete `text-danger`.
2. **`ExportButton.tsx`:** the button is secondary; messages `text-muted` / `text-danger`.
3. **`Us.tsx`:** the page is currently centred text. Make it a vertical stack `space-y-5` of cards (wrap the signed-in block in `bg-card rounded-3xl shadow-card p-5 text-center`, keep the text and buttons): the title `Us` in the style of the other titles (`text-2xl font-extrabold text-ink`), "Signed in as" in `text-ink` with the email `text-muted`, the Sign out button the secondary button, the Install app button the primary button, the install hint `text-muted`. Leave the other cards (`CopyCode`, `SwitchHousehold`, `GoalsCard`, `YouCard`, `DataCard`, `WeekCard`) in the same order and untouched (task 63 restyles them).
4. **Appearance card:** import `ThemeToggle` from `../ui/ThemeToggle` (task 50a created it; if the file is missing, stop and say so) and render `<ThemeToggle />` on the Us page, directly after the signed-in block.

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for these three files. The only new visible text is the "Appearance" heading and the three theme buttons (they come from `ThemeToggle`).
- The reply format in `redesign-common.md`.
