# 86: Separate Take photo and Choose photo

## Prompt
> On Android, adding a photo only opens the gallery, so I can't take a picture. In the photo field, give me separate Take photo and Choose photo options, where Take photo opens the camera directly. Make your own decisions on the details instead of asking me.

## Run
gemma4:12b-128k at **High**, Standard mode, web UI, Full access. About 3 minutes, in two turns: it gave up after 9 failed steps, and the user sent "keep going". It read only `PhotoField.tsx`, then replaced the whole file because its edits kept failing (extra spaces in `old_string`). It never ran tsc or vitest, so its report has no check output.

## What was wrong
- **The core fix was right:** a second input with `capture="environment"`.
- **Replacing a photo still had no camera.** "Change" went to a third input with no `capture`. Its report said Change had been replaced by both options; it hadn't.
- **The `hint` text was dropped** at all four places that pass it. tsc doesn't flag it.
- **The options were tiny** underlined `text-xs` links.
- The file's top comment was out of date.

## What I changed
- `PhotoField.tsx`: two inputs only. Take photo and Choose photo always show as buttons, plus Remove when there is a photo. The hint is back above them when there is no photo. Comment updated. Code map regenerated for the new comment.

## Checks
tsc clean, 668 tests pass. On the mock at phone size: Take photo points at the `capture` input and Choose photo at the plain one; a test image uploaded and showed Take photo, Choose photo and Remove with no overflow.

## Not done
The real camera needs a test on the user's Android phone.

## Lesson
Gemma is fast on a one-file job but gave up on repeated edit failures, skipped the checks and overstated its report. Compare what a model says against the diff.
