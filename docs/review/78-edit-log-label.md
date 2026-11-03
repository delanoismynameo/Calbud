# 78: See and edit the Nutrition Facts of a logged food

## Prompt
A short plain prompt: in `EditMealLog` (tap a logged food on Today), show the Nutrition Facts label for what was logged, editable like `ServingPicker`'s tap-to-correct; Save stores corrected calories, macros and extras; corrected numbers scale if the grams change; Cancel throws them away; tests for new logic. Branch `task78-edit-log-label`.

## Run
Laguna XS 2.1 at **Default** effort (chosen by the user), web UI, Full access. 26 min 41 s, 118 steps, ~46 tok/s, 7.8M tokens. Its report (tsc passes, 624 tests) was true.

## What was wrong
- **Rounding on save:** the log was turned into per-100 g values with `kcal100g: Math.round(kcal / grams * 100)`, so saving without any edit could change the calories (a 1,000 g log of 1,234 cal would save as 1,230). `rescaleLog` never rounded there. Fixed by not rounding, with a test (mutation-checked: putting the rounding back fails it).
- Minor, left as is: the helpers (`logToVirtualFood`, `computeNutrition`) are exported from the component file, and the stand-in food has `source: 'usda'`, `sourceId: 'unknown'`; neither leaves the component.

## Mock click-through
Yogurt logged at 150 g / 89 cal: tapping it shows the label; Calories corrected to 100, grams changed to 300 → label 200 cal, Protein 31 g; Save wrote 300 g, 200 cal, 30.6 g protein, 10.8 g carbs, 1.2 g fat, and the Today row shows 200 cal. Correcting to 999 then Cancel left the log at 200.

## Verdict
Usable after one small fix; it reused `applyLabelEdit`, `labelRows` and `scaleExtras` instead of writing its own, and its checks were real. tsc clean, 625 tests, build clean.
