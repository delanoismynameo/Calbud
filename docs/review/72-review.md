# 72 review: check another model's work

You are a reviewer. Another model completed the brief `docs/review/72-label-dark.md` and its work is the latest git commit (`git show HEAD`, or `git diff HEAD~1 HEAD`). Do not edit, create or delete any file, and do not commit.

## What to do
1. Read `docs/review/72-label-dark.md` (the brief) and `docs/review/features-common.md` (the rules the builder had to follow).
2. Read the diff of `src/food/NutritionLabel.tsx` in the latest commit, and read the whole current file.
3. Check each numbered step of the brief against the diff: done exactly, partly, or not at all.
4. Check the rules: only the one listed file changed, no `dark:` variants, no hex, no `gray-`/`black`/`white` classes left, only token classes, no markup or text changed, light mode appearance unchanged (the new tokens must resolve to white/black-like values in light mode: look at the `:root` variables in `src/index.css` and say whether `bg-card`, `text-ink`, `border-ink` and `border-muted` are right for a label in both themes).
5. Look for anything the builder missed or got wrong, such as a rule that would be too faint or too heavy in dark mode.

## Reply
Your last message has: a verdict (PASS or FAIL); a table of the brief's steps with done / not done; the problems you found, each with the line; and anything you could not check. Do not claim you saw it render: you cannot run the app.
