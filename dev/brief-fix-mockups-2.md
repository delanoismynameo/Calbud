# Brief 2: fix the look of `dev/calbud-mockups.html`

The first round fixed the syntax. The page still renders wrong: every phone is white, A's cards overflow, B's donut is on top of a gradient and overflows its box, and C has a stray orange block and a clipped nav. Claude checked this in a browser.

## Rules
- **Do not rewrite or recreate the file.** One small edit per step, in order, with the edit tool, finding each spot by its text. No scripts, no new files, no npm/node.
- Change only `dev/calbud-mockups.html`. Stay inside the step you are on. Do not "improve" anything else.
- Do not change text content, emoji, or colors except where a step says so.
- At the end, re-read the file once and report each step as done or not done. Do not say the page "looks right"; Claude will open it in the browser.

## CSS (inside `<style>`)
1. In the `.phone { ... }` rule under "Shared Layout Fixes", delete `background: #fff;`. That declaration overrides `.con-a`, `.con-b` and `.con-c`, which is why all three are white.
2. In `.meal-subtitle`, add `display: block;`.
3. Add this new rule on its own line after the `.con-a .card { ... }` rule:
   `.con-a .card.meal-item { width: auto; margin: 6px 0; padding: 12px 14px; }`

## Concept A
4. Find `<div style="display:flex; justify-content:center; align-items:center; gap: 10px; margin-top:-15px">` (it wraps the ring SVG and the meal list). Replace its style with `display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; overflow-y:auto; padding-bottom:90px;`.
5. The next `<div>` inside it has `style="flex: 1.2; padding-left: 4px;"`. Replace that style with `width:100%; padding:0 16px; box-sizing:border-box;`.
6. The "Nutrition Goals" block has `<div style="margin-top: 24px; padding: 10px 4px;">`. Leave it. Inside it, the `<svg width="100%" height="40" viewBox="0 0 300 40">` is fine; do not touch it.

## Concept B ("Today's Totals" SVG, `height="120"`)
7. Delete the whole `<defs> ... </defs>` block with `id="grad"`.
8. On the big `<rect x="12" y="8" width="351" height="104" rx="20" ...>`, replace `fill="url(#grad)" opacity="0.9"` with `fill="#181b25" stroke="#2a2e3b"`.
9. Replace the two donut elements with these two, in the same place:
   `<circle cx="140" cy="60" r="34" fill="none" stroke="#264a33" stroke-width="12"/>`
   `<path d="M140 26 A34 34 0 1 1 106 60" fill="none" stroke="#d9f437" stroke-width="12" stroke-linecap="round"/>`
10. Move the three stat rows up by 5 px so they line up with the donut centre: in each of the three `<rect x="210" y="…">` and `<text x="250" y="…">` pairs, subtract 5 from `y` (30→25, 54→49, 78→73 for the rects; 38→33, 62→57, 86→81 for the texts).

## Concept C
11. Delete the line `<div style="height:80px; width:86px; background:linear-gradient(135deg, #fed7aa, #fdba74); border-radius:24px; margin: 0 auto 8px auto;"></div>` (the empty orange block).
12. In the progress SVG (`height="18"`), replace `<path d="M0 9 Q 120 -10 375 9" ... />` with `<rect x="0" y="4" width="225" height="10" rx="5" fill="#fb923c"/>`.
13. The last SVG (`height="84"`, the nav) gets `style="position:absolute; bottom:0; left:0;"` added to its opening tag. Replace its contents with:
    `<rect x="0" y="20" width="375" height="64" fill="#ffffff" stroke="#f5f5f4"/>`
    `<circle cx="187" cy="52" r="24" fill="#ffedd5"/>`
    `<path d="M173 54 l14 -12 l14 12 v12 h-28z" stroke="#ea580c" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`

## Done means
- `grep -n "background: #fff;" dev/calbud-mockups.html` shows nothing inside the `.phone` rule.
- `grep -n "url(#grad)\|id=\"grad\"" dev/calbud-mockups.html` shows nothing.
- Report steps 1–13 as done or not done.
