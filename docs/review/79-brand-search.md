# 79: Brand search box

## Prompt
A short plain prompt: in `FoodFinder` (Add food and the prep dish builder), split the search row 2/3 food search, 1/3 a small Brand box; tapping it or typing in it moves it to its own full-width line with a clear button, back only when empty and not focused, and it must stay the same input so the keyboard isn't lost. Empty brand = search as now; a brand shows only that brand's packaged foods (USDA branded search with its brandOwner filter, plus a loose brand match), hides basic foods, filters Your foods; a brand alone lists its products; a no-match message with Clear brand. Tests. Branch `task79-brand-search`.

## Run
Laguna XS 2.1 at **Medium** effort (chosen by the user), web UI, Full access. 23 min 3 s, 122 steps, ~45 tok/s, 8.6M tokens. Its report (tsc clean, 636 tests) was true, but the feature didn't work as asked.

## What was wrong
- **The USDA brandOwner filter (my suggestion in the prompt) is the wrong tool.** Checked live: `brandOwner: "kirkland"` gives 0 hits, because Kirkland Signature foods are listed under "Costco Companies Inc."; "Chobani, LLC" gives 3,754 loose hits. Replaced with required words in the query (`+kirkland +signature greek yogurt`), which matches the brand name, owner or description, then a client-side check that every brand word starts a word of the food's brand or name (`src/food/brand.ts`).
- **Not one moving input:** it rendered a fake "Brand" div in the 1/3 slot and a second input on line 2, focused from a `setTimeout`; iPhone won't open the keyboard from that. The empty 1/3 slot also stayed, so the food search never went full width. Rewritten as one input in a 3-column grid whose `col-span` changes.
- **Brand alone didn't work:** `empty`/`tooShort` still keyed off the food box only, so a brand with an empty food box showed Favorites and Recent instead of results, and never "settled".
- `Promise<any>[]` cast (against the project rules); brand not debounced (a USDA call per keystroke); Your foods kept unbranded foods when a brand was set; its `matchesBrand` matched any one word ("Greek" matched a brand). Its tests checked the brandOwner filter, so they passed on the wrong design.
- Also: the long food placeholder was cut off in the 2/3 slot, so it's "Search foods" until the brand box opens. No slide animation; the move is instant.

## Mock click-through
Phone size, Add food: food search and "Brand" side by side; focusing Brand moves it to its own line (same element, still focused) with "Brand, e.g. Chobani" and a ✕. "fairlife" alone listed Fairlife milks and yogurt (Packaged). "chobani" + "greek yogurt" gave only Chobani Greek yogurts. "zzqbrand" showed `No zzqbrand foods match "greek yogurt".` with Clear brand. "fage" + "yogurt" put the household Fage yogurt under Your foods. Clearing it and tapping away put it back in the 1/3 slot.

## Verdict
Not usable as delivered (wrong filter and a two-input layout), but the plumbing (brand through `useFoodSearch` → `searchFoods` → one branded search, no-match message) was in the right places and kept. The brandOwner mistake started in my prompt. tsc clean, 635 tests (filter test mutation-checked), build clean.
