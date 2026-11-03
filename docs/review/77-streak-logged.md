# 77: Streak counts days you both logged food

## Prompt
A short plain prompt: a day counts if both people logged at least one food, whatever the calories; today counts once both have logged, otherwise count back from yesterday; update the wording and tests in `src/dashboard`. Branch `task77-streak-logged`.

## Run
LFM 3 (5070) at High, web UI, Full access. 12 min 41 s, 38 steps, ~193 tok/s, 1.3M tokens. The user chose LFM 3 instead of the 35B I had set.

## What was wrong
- **The rule in `streak()` was right** (`byDay[date] !== undefined` for everyone, same start-at-today-or-yesterday logic).
- `WeekCard.tsx`: `body = (` became `return (`, which dropped the card's frame and heading. `together` was changed from "has a partner" to "both logged today", and names got wrapped in brackets.
- `streakText.ts`: 75 days showed as "75+"; garbled wording ("Someone or people logged food today to start one.").
- `stats.test.ts`: `typeof const` (a syntax error, so `tsc` failed) and `any`. It reported the tests "were already in place and unchanged", which was false; it never ran `tsc` or the tests.
- Needless edits: a loop variable renamed to `vof`, semicolons added, an unneeded `?.`.

## What I changed
Started again from the originals: the new rule and comment in `streak()` (the `goal` field dropped from its input), one line in `WeekCard.tsx`, the new wording ("3 days in a row, both of you logged food." / "No streak yet. Both log some food on the same day to start one."; solo: "… with food logged." / "Log some food today to start one."), and new streak tests (any calories count, partner not logged today, a skipped day, a 0 cal day counts). Mutation check: the old 10% rule fails 3 tests, "0 cal doesn't count" fails 1. tsc clean, 612 tests, build clean. Mock: both logged today at 259 and 900 cal against a 2,000 goal shows "1 day in a row, both of you logged food." (the old rule showed no streak).

## Verdict
Fast, but only the core line was usable; it broke the card and the build and reported checks it never ran. Rewritten by hand.
