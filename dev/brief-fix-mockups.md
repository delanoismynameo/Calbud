# Brief: fix `dev/calbud-mockups.html`

One file, 306 lines: three phone mockups (A Minimal Air, B Deep Focus, C Soft Coral). It has syntax mistakes that stop parts from rendering. Fix only the items below.

## Rules
- **Do not rewrite or recreate the file.** Make one small edit per step, in order, with the edit tool. Do not write a new file, a Python script, or a base64 blob.
- Change nothing outside `dev/calbud-mockups.html`. Do not create files, run npm/node, or touch the rest of the repo.
- Do not change the design: same colors, sizes, text and layout, except where a step says otherwise.
- Do not add, remove or reorder concepts. Line numbers are for the original file and shift as you edit, so find each spot by its text.
- Finish by re-reading the file once to check each step. If a step can't be done as written, say which one and why. Do not invent a different fix.

## Steps

**CSS**
1. In `.prompt-overlay`, change `left:open` to `left:0`.
2. The rule `.con-a, .con-c .nav-bar { color: var(--text-muted); }` should be `.con-a .nav-bar, .con-c .nav-bar { ... }` with the same declaration.
3. There are two `.phone` rules (the first near the top, the second under "Shared Layout Fixes"). Delete the first one. Keep the second as it is.

**Concept A**
4. The two emoji data-URI `<img>` tags end with `<\/svg>`. Change both to `</svg>`.
5. In the ring `<svg>`, the text `#EAT` becomes `1,135`.

**Concept B**
6. In the "Today's Totals" SVG, the three `<text ... font-weight:600>` elements (Pro 92g, Carbs 184g, Fat 58g) have a bare `font-weight:600`. Change each to `font-weight="600"`.
7. In the same SVG, the `<defs>` block comes after the `<rect fill="url(#grad)">` that uses it. Move the `<defs>...</defs>` block to be the first child of that `<svg>`.
8. In the nav bar, the second item contains `<br style="margin-top: 2px;"><svg viewBox="0 0 24 24"><circle .../></svg>`. That inner svg has no width/height. Add `width="8" height="8"` to it.

**Concept C** (the big `<svg width="100%" height="500">`)
9. BREAKFAST `<text>`: change `text-transform="uppercase" font-weight:700 letter-spacing="1.5px"` to `font-weight="700" letter-spacing="1.5"`. (SVG has no text-transform; the text is already uppercase.)
10. Breakfast `<rect>`: change `fill:white` to `fill="white"`.
11. The "580" and "720" `<text>` elements: change the bare `font-weight:600` to `font-weight="600"`.
12. Lunch `<rect>`: it reads `fill="none" stroke:#fef3c7 stroke-width:2"`. Change it to `fill="none" stroke="#fef3c7" stroke-width="2"`.
13. Dinner `<rect>`: it reads `stroke:#f5f5f4 stroke-dasharray:"6 3"`. Change it to `stroke="#f5f5f4" stroke-width="2" stroke-dasharray="6 3"`.
14. Dinner "+" `<text>`: it reads `fill="#d1d5db"+>+</text>`. Change it to `fill="#d1d5db">+</text>`.
15. The three macro-pill `<text>` elements (72g, 94g, 56g) have `font-weight:600` and a `color:` or `color="..."` that does nothing in SVG. In each, change them to `font-weight="600" fill="<that same color>"`. The colors are `#991b1b`, `#854d0e` and `#166534` in order.

## Done means
- `grep -n 'font-weight:[0-9]' dev/calbud-mockups.html` finds only the CSS rules and the inline `style="..."` attributes, none inside SVG tags.
- `grep -n '<\\/svg>\|left:open\|#EAT\|"+>' dev/calbud-mockups.html` finds nothing.
- Reply with a list of steps 1–15 marked done or not done. Do not claim the page "looks right"; Claude will open it in a browser and check.
