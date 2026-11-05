# 85: Water bottle size on the water card

## Prompt
The user's own words, lightly tidied, with no file names and no mention of the code map:
> On Today's water card, I want to be able to set the size of my water bottle (mine is 18 oz) and then add a whole bottle with one tap, next to the +8, +16 and +24 buttons.

## Runs
Ornith 1.5 35B at **High**, web UI, Full access.

- **PTC mode (first try): failed in 2 minutes, nothing changed.**
  - In PTC mode the model's only tool is `run_code`, which runs a small program; inside it, the real tools are called as `await tools.name(...)`.
  - Ornith never worked that out. It redeclared `tools`, ran `grep` through Node on Windows (it isn't installed), sent empty programs, and stopped.
  - Its file reads were still the right ones: the water files, the water test and the water migrations.
- **Standard mode: done, with two misreads of the user's answers.**
  - **It read the right things:** the water files, the profile type, `useProfile`, the Us page cards, the water and security migrations, `CODEMAP.md` and `AGENTS.local.md`. It also opened a few files it didn't need (theme, `vite.config`, `index.css`).
  - **It asked where to save the size and misread the answer twice.** First it asked again. After the second answer ("Save to your profile") it invented a user message ("I would like to see it first"), deleted its migration and started a browser-storage version. The user corrected it in chat and it went back to the profile.
  - **It wrote a false note to `AGENTS.local.md`** during the storage detour ("localStorage-only, no migration"), never removed it, and its report said that file was untouched. I removed the note on 2026-11-05.
  - **Its report was accurate about the checks:** tsc clean, 668 tests. It ran `codemap.mjs` this time, after the rule was widened to cover new exports.
  - About 2.5 hours wall time, of which roughly 1 hour was waiting for the user's answer.

## What it built
- **Migration `20261105000200_water_bottle.sql`:** `profiles.bottle_oz int not null default 18`, checked between 1 and 500, plus `grant update (bottle_oz)`. It matches `goal_water_oz`. Fine.
- **`Profile` type:** gains `bottle_oz`.
- **`WATER_BOTTLE_OPTIONS = [8, 16, 18, 24, 32]`** in `water.ts`.
- **`WaterCard`:** a size select and a "+bottle" button, saved with a profile update. `Today` passes `bottleOz`.

## What was wrong
- **The size never changed on screen.** The select's value came from a `useState` that was set once and never updated. Picking 24 saved 24, but the select stayed on 18 and the button still added 18.
- **Cramped layout:** the select, the bottle button and the three quick adds were all in one row on a phone.
- **It called `useProfile()` inside `WaterCard`,** although `Today` already passes the size, and it refetched the water logs after saving the size.
- **A failed save showed no error.**

## What I changed
- **`WaterCard`:**
  - The size comes from the profile, and the new size shows straight away while it saves.
  - Saving refreshes the profile query.
  - Removed the extra `useProfile` and `useState`.
  - The quick adds are back on their own row, with "+ Bottle (18 oz)" and the size select on a row below.
  - Save errors show under the card.
- **`scripts/dev/mock-supabase.mjs`:** knows `bottle_oz` (default 18, and editable).

## Mock click-through (phone size)
- **Before teaching the mock the column:** changing the size showed "permission denied for table profiles". That is what the live site will show if the app goes out before the migration.
- **After:**
  - Picking 24 oz changed the button to "+ Bottle (24 oz)".
  - Tapping it took the total from 48 to 72.
  - After a reload, it still said 24 oz.
- **A partner's read-only card** has no bottle controls (it's inside the `readOnly` guard).

## Not done
- **The migration must be applied to the live database before pushing.** Without it, changing the size fails with a permission error, though the bottle button still adds the 18 oz default.

## Lessons
- **PTC mode** suits batch-and-filter jobs, not editing. Ornith couldn't use it, so use Standard for Calbud tasks.
- **Widening the codemap rule to new exports worked:** this time the model ran the script.
- **A long wait for the user's answer seems to muddle Ornith's memory of what was said.** If a run asks a question, check its next step against the answer.
