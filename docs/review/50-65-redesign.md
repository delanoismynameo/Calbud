# 50–65: Redesign to "Fresh Coral & Green Circle" (light and dark)

Plan: [`../DESIGN_PLAN.md`](../DESIGN_PLAN.md). Briefs: `50-…` to `64-…` here, with shared rules in `redesign-common.md`. Work is on branch `redesign`, not merged to `main`.

## Run
- Model / effort: qwen3.6 35B-A3B at High, headless, one brief per run (about 3 min each).
- Outcome: all 16 runs finished. Claude ran `npx tsc -b`, `npm test` and the build after each (the headless sandbox blocks npm), then fixed what was wrong.
- Final state: type check clean, 440 tests passing (414 before the redesign + 26 new), build passes. Checked in a browser on the mock Supabase at 375 px, in light and dark: Today, Prep, Plan, Us, Add food.

## What I fixed after the model (the lessons)
- **50a:** used a global `JSX` type that React 19 doesn't have.
- **52/55:** a helper named `dayStrip.ts` next to `DayStrip.tsx` clashed on case-insensitive Windows (`tsc` TS1149). Renamed to `stripDays.ts`.
- **57:** coral text used `text-coral-deep`, unreadable in dark. Now `text-link` everywhere (rule added to the common brief).
- **60, 62:** the model stopped before converting every input and button (PrepForm's inputs and Save/Delete/Cancel, Us's household block), and left a broken toggle in PrepForm. Finished by hand.
- **61:** mangled UTF-8 (`‹ › …` became `â€¹ â€º â€¦`) and dropped two `>`, breaking the build. Later also found `Â·` in the same file. Rule added to the common brief; checked every changed file's non-ASCII characters against the baseline.
- **63, 56:** dropped the `disabled:` prefix (`disabled:cursor-not-allowed opacity-50` became `cursor-not-allowed opacity-50`), so Save buttons always looked disabled.
- **64:** turned the Create/Join choice buttons into a toggle that compared against an impossible mode (type error). Restored as plain buttons.

## Not done / for the user
- The floating Add button overlaps the kcal pill at the right of a meal row while scrolling. The mockup has the same overlap.
- `public/icon.svg` and the PNG icons are still sky blue; recolour them if wanted.
- Not tried: a real phone, the barcode camera, and the sign-in screens in a browser.

## Verdict
Usable after fixes. One-line lesson: reskin runs finish fast but quit early or mistype; always grep for leftover old classes, non-ASCII damage, and dropped `disabled:` prefixes after every run.
