# 82: Back from a picked food returns to the search

## Prompt
A short plain prompt, typed in the chat box, using the user's own words. On Add food, after picking a food, back went all the way to the home screen. Back should return to the search, with the search text still there, for both the phone's or browser's back button and the Back link. It said to start in `src/pages/AddFood.tsx` and to use `CODEMAP.md`, plus the usual guard rails: tests, tsc, vitest, don't commit, don't delete files. It was the first run with `CODEMAP.md` and the new AGENTS.md lines.

## Run
Laguna XS 2.1 at **High**, web UI, Full access. 32 min 38 s, 100 steps, ~46 tok/s, 6.7M tokens. Raw output in commit 50adbff.

Its report was accurate about the checks (tsc clean, 665 tests), but its description of how the fix works was wrong. **It never opened `CODEMAP.md`.** It went straight to `AddFood.tsx`, `FoodFinder.tsx`, `App.tsx` and a grep for `navigate|history`. Because of that it never noticed that the app uses a `HashRouter`.

## What was wrong
- **The phone's back button still didn't work.** The `popstate` handler read `event.oldState`, but `PopStateEvent` has no such property. A cast hid this from tsc, so the check was always false and the picked food stayed on screen.
- **Picking a food broke the address.** It called `window.history.pushState(…, location.pathname + location.search)` beside React Router. With the hash router that turned `/Calbud/#/add` into `/add`, so a reload would 404 on GitHub Pages.
- **The Back link left a dead entry.** It cleared the state but left the pushed entry, so the next back did nothing visible.
- **The tests tested nothing.** The 6 tests in `AddFood.test.ts` copied the constant and ran `x != null || y` on local variables, never importing app code. There were also `as` casts, trailing whitespace and a missing final newline.

## What I changed
- **`src/pages/addFoodStep.ts` (new, tested):** the step (`food` or `create`) lives in React Router's location state. `stepFrom` reads it and ignores any other state.
- **`AddFood.tsx`:**
  - Picking a food or opening Create a food navigates to the same address with that state.
  - Back (the phone's button, the link or Cancel) is `navigate(-1)`, which pops the entry and shows the search again. The search stays mounted, so its text survives.
  - Saving a new custom food replaces the entry instead of adding one.
  - Logging replaces the entry with Today, so back from Today lands on the search.
  - After a reload on the food step, the search shows.
- I deleted the model's test file and added `addFoodStep.test.ts` (2 tests).

## Mock click-through
Phone size, against the mock.
- I typed "oatm" and picked Oatmeal. The address stayed `/Calbud/#/add`.
- The browser back button, the Back link and Cancel each returned to the search with "oatm" still there. One more back went to Today.
- Create a food followed by back returned to the search.
- Logging went to Today, and back from there returned to the search.
- A reload on the food screen showed the search.

## Lesson
Laguna didn't use the code map, and it guessed a DOM API (`oldState`) that doesn't exist, then cast its way past tsc. Next time, put the map in the first line ("Read CODEMAP.md first") instead of mid-prompt, and keep watching for casts that hide a wrong guess.
