# 87: Unit converter on the amount box

## Prompt
> When I enter an amount in grams on Add food and in the recipe builder, add a Convert option to the right of the amount box. I tap it, pick a unit (pounds, ounces or kilograms), type how much I have, and it fills in the grams. For foods measured in ml, offer fluid ounces, cups, tablespoons and teaspoons instead. Make your own decisions on the details instead of asking me.

## Run
QwOpus 3.6 35B (the bench's `qwopus3.6-35b-a3b-coder` Q4 GGUF, 128k), Standard mode, web UI, Full access. About 6 minutes, 24 steps. It went straight to `ServingPicker`, `RecipeBuilder` and `recipeDraft`, with one clean edit after another. tsc was clean. It ended with an empty message, so there is no report. It didn't run vitest or the code map, and added no tests. `AGENTS.local.md` is unchanged.

## What was wrong
- **Convert filled the Servings box:** on the default Servings view, 1 lb went in as 453.59 servings.
- **Pressing Enter in the popup would submit the log form around it,** logging the food.
- **The popup ran off the right edge** on a phone, and on Add food the amount box lost its full width.
- **Conversion numbers were written twice,** in unused tables and in an if-chain, in a component with no tests. It read the typed number itself instead of using `readAmount`.

## What I changed
- **`convert.ts` (new, tested):** `convertUnits` and `convertAmount`, using `readAmount`, rounded to one decimal.
- **`ConvertPopup.tsx`, rewritten:** takes `unit`, stops Enter submitting, opens to the left and stays on screen.
- **`ServingPicker`, `RecipeBuilder`:** Use switches to grams and fills in the amount; layout fixed.

## Checks
tsc clean, 674 tests pass. On the mock at phone size:
- **Add food:** Servings view, 1 pound shows "= 453.6 g"; Enter switched to Grams with 453.6, the calories updated and nothing was logged.
- **Recipe builder:** 4 ounces filled in 113.4 and the label followed.
- No overflow and no console errors.
- The ml list was only checked by unit tests, not clicked through.

## Lesson
The cleanest run of the local models so far for following the map to the right files, but none of the behaviour was tried, and it stopped without a report. Unit toggles next to an amount box are a trap: check every mode a control can be used in.
