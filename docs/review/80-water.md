# 80: Water tracking in fl oz

## Prompt
A short plain prompt: a migration for a new `water_logs` table (one row per add) with row security like `meal_logs`, and a water goal on profiles defaulting to 64; look at the earlier migrations for how they're secured; add it to `scripts/test-db.mjs` with policy tests. Today: a Water card under the day strip ("32 / 64 fl oz", blue bar for light and dark, +8/+16/+24 oz, undo of the last add, "Goal reached" and keeps counting, works on past days). Us: editable water goal, a partner's day shows their water read only. Not in the streak. Add the table to the mock. Branch `task80-water`.

## Run
Laguna XS 2.1 at **High** effort, web UI, Full access. 21 min 35 s, 131 steps, ~46 tok/s, 9M tokens. Its report (tsc clean, 639 tests, 72 DB tests) matched; "12 new DB tests" was 9.

## What was wrong
- **Past days backwards:** the +oz buttons were disabled on past days and Undo was shown only on past days. "Past" was also worked out from the UTC date, not the local one.
- **Undo only for this visit:** it remembered the last add by re-fetching after the insert, so after a reload (or on any other day) there was nothing to undo. Undo now removes the day's newest add from the loaded list (`lastAdd`, tested).
- **Colors:** `bg-blue-500` (not a theme color) and `text-success`/`bg-success`, which don't exist here, so "Goal reached" had no color. Added a `--c-water` token (#0284c7 light, #38bdf8 dark) and `bg-water`/`text-water`.
- **Database:** no `revoke all … from anon, public` (every other table since 76 has it; DB test added and mutation-checked); `amount_oz numeric` with no upper limit, goal only `> 0`. Now `int` 1–200 per add and goal 1–500, with tests.
- Partner view: a hand-built copy of the bar, a duplicate `useQuery` import under another name, an unused `ringDash` import. It now reuses `WaterCard` with `readOnly`. Removed an unused `fetchWaterLogsSum`. No error or loading state on the card; added.
- Not asked but needed: water added to the data export (Us → Your data).
- Right as delivered: the policies (same as `meal_logs`), the goal column grant, realtime publication, the mock endpoint, goal validation 16–500 in `parseGoals` with tests.

## Mock click-through
Phone size. Today showed 48 / 64 fl oz from the mock's seed; +24 → 72 / 64 "Goal reached 💧" (mock: 32, 16, 24); Undo → 48, row gone; yesterday: 0 → +8 → 8 / 64 saved with yesterday's date. Us: goal edited to 90 → "90 fl oz water" and Today showed 72 / 90. Bob's day: "48 / 80 fl oz", no buttons. Bar color #38bdf8 dark, #0284c7 light.

## Verdict
The database half was close (one missing revoke); the card was not usable on past days and undo didn't survive a reload. Fixed by hand. tsc clean, 645 tests, 76 DB tests, build clean. **The migrations are not applied to the live database yet.**
