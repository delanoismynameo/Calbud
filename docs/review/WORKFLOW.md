# Calbud Build Workflow: Local Harness Builds, Claude Reviews

The DeepSeek Harness (`dsh`) with local models does the implementation. Claude writes each task brief, waits until the harness has finished, then reviews and corrects the output. Every task gets a short review note in this folder: what went wrong, what was fixed, and the lesson.

---

## Model Roles

Based on the tests from the "Local LLM offloading with Ollama" session (Campus Fountains `streak.js` tasks and the Bowling kata, scored by planted bugs).

| Model | Evidence | Role in Calbud |
|---|---|---|
| **Qwen 3.6 35B-A3B, 128k** (`qwen3.6:35b-a3b-128k`, Ollama) | Scoped streak task: **~4 min, 36 tests, 4/4 bugs**. Bowling 31/31 in ~8 min. ~79 tok/s. Failed the whole-file streak task. | **Main builder.** Every task starts here. |
| **Qwen 3.8 27B, official 4-bit** (`qwen3.8:27b (tuned server, 64k)`, via swap proxy) | Scoped streak task: **~21 min, 57 tests, 4/4 bugs**. Produced nothing in 62 min on the whole-file task. Reads unneeded files first. | **Second attempt.** Used when the 35B fails a task, and for logic-heavy pieces where more tests help (RLS SQL, `.ics` builder, macro scaling). |
| **Swift 1.5 27B** (Q3_K_M, Ollama or tuned server) | Downloaded and verified, **never finished a test**. Maker claims ~15–25% less thinking than base 27B. | **Candidate.** Run a head-to-head with the 27B on the first hard task (RLS migration). Whichever does better becomes the second-attempt model. |
| Gemma 4 12B | Stopped silently after 43 s on the scoped task, with and without rules. Loops on Bowling. | **Not used for coding.** It probably wrote the first `GAME_PLAN.md`, which had stale facts. |
| Qwen 2.5 Coder 7B | Printed a fake tool call as text and stopped, in both the harness and OpenCode. | **Not used.** |
| Qwen 3.8 27B MTP BF16 (55 GB) | Larger than RAM + VRAM combined. | **Not used.** |

**Hardware constraint:** only one model fits on the GPUs at a time (RTX 5070 12 GB + RTX 3050 6 GB, 32 GB RAM). The swap proxy on port 8100 unloads the old model before loading the next, which costs 15–25 s. Tasks are batched by model rather than alternating.

---

## Task Sizing Rules

The clearest result from the earlier tests: **the same model passed a scoped task and failed the whole-file version.** So every brief:

1. Covers **one unit**: one component, one module, one migration, or one function plus its tests.
2. Lists the **exact files to read**. The 27B otherwise spends 5–10 minutes reading irrelevant files.
3. States **acceptance criteria** Claude can check: the command that must pass, the behaviour, and what must not change.
4. Says to **write files in small chunks** (around 100 lines per write). That rule helped the 27B finish.
5. Avoids "triage first" or long escalation rules. Those caused silent stops for Gemma and the 35B.
6. Runs tests with plain `node <file>` or `npx vitest run`, not `node --test`, which hit a sandbox permission error in the harness.

---

## Per-Task Loop

1. **Brief.** Claude writes the task brief (scope, files, acceptance criteria) and saves it as the first section of the task's review note.
2. **Run.** Default: Claude opens the web UI in its built-in browser using the sign-in link that `start-deepseek-harness.bat` saves to `local-llm-tools\deepseek-harness\harness-run.log`. It starts a **New Session in the Calbud workspace**, checks that the picker shows `qwen3.6:35b-a3b-128k` and that the permission mode is **Full access** (it's per-session, and new sessions start in Workspace Write, which blocks `npm`/`node`) before sending, pastes the brief, and checks the page until the run ends. Runs started this way show up in your web view, and you can watch them live.

   Fallback, headless (runs don't appear in the web view). From the Calbud folder (PowerShell):
   ```
   $h = "C:\Users\orgo1\Documents\local-llm-tools\deepseek-harness"
   $env:DSH_HOME = "$h\home"; $env:OLLAMA_LOCAL_API_KEY = "ollama"
   & "$h\install\node_modules\.bin\dsh.cmd" --profile headless --patch "$h\calbud-local.yml" --json "<brief>"
   ```
   `calbud-local.yml` swaps the headless profile's default (`deepseek-flash`, DeepSeek's cloud) for the local 35B through the swap proxy. The key is a placeholder: Ollama ignores it, but the harness refuses to start without one. To use the 27B or Swift, add a second `--patch` that overrides `agent-default-model`.
   The run continues until the harness exits. No time limit is imposed; slow runs are recorded, not killed.
3. **Check.** Claude reviews the git diff, then runs the build, the tests and any acceptance checks.
4. **Escalate if needed.** If the 35B's output fails badly (doesn't build, wrong approach, silent stop), the same brief goes to the second-attempt model before Claude fixes anything. Both results are recorded.
5. **Fix.** Claude makes the corrections, commits them separately from the harness commit so the diff shows exactly what was changed, and writes the review note.

---

## Review Note Template

One file per task: `docs/review/NN-short-name.md`.

```markdown
# NN: <task name>

## Brief
<the exact brief sent to the harness>

## Run
- Model / effort:
- Wall time:
- Outcome: finished / silent stop / looped / escalated to <model>

## Result
- Builds: yes/no. Tests: X passing, Y failing.
- Acceptance criteria met: ...

## What I changed
- <file>: <change> — <why>

## Verdict
Usable as-is / usable after small fixes / rewritten. One-line lesson for future briefs.
```

Keep notes short (since task 13): no long code overviews and no "how I would have done it" section.

---

## Setup Needed Before Task 01

- [x] `git init` in the Calbud folder, with one commit for the plan docs, so every harness run has a clean diff.
- [x] Calbud workspace in the harness: already exists (`Documents\Calbud`, created 2026-10-27, one session).
- [x] Local-model overlay `local-llm-tools\deepseek-harness\calbud-local.yml` (instead of a separate profile): 35B default, swap proxy, web profile's search settings.
- [x] The swap proxy running (`start-deepseek-harness.bat` starts it; a headless run needs it started separately).
- [x] Smoke test (2026-10-27): the 35B created `smoke-test.txt` with "ok" in 42 s, two steps, no extra files touched. The session was saved under `home\sessions\--C-Users-orgo1-Documents-Calbud--\` but not added to the Calbud workspace's session list, so it may not show in the web view.

## Task Log

The current status and next steps are in [`docs/STATUS.md`](../STATUS.md). Each task's brief and review is in this folder.

| # | Task | Model (effort) | Result |
|---|---|---|---|
| 01 | Scaffold Vite + React + TS + Tailwind + PWA, HashRouter | 35B | Usable after small fixes |
| 02 | GitHub Actions deploy workflow | 35B | Usable |
| 03 | Supabase migration: tables | 35B | Usable after a trivial fix |
| 04 | Migration: RLS, profile trigger, household functions | 27B vs Swift | Both correct; the 27B was kept |
| 05 | RLS test script | 35B (Default), then 27B | The 35B failed; the 27B was usable |
| 06 | Supabase client (PKCE) and auth screens | 35B (High) | Usable after real fixes |
| 07 | First-run setup (profile, household, invite code) | 35B (High) | Usable after real fixes |
| 08 | Profile loading on TanStack Query | 35B (High) | Usable after a 2-line fix |
| 09 | USDA / Open Food Facts clients and macro scaling | 35B (High), twice | Run 1 invented fixtures; run 2 was usable |
| 10 | Add-food flow (search, portion, log) | 35B (High) | Usable after real fixes |
| 11 | USDA Branded replaces Open Food Facts text search | 35B (High) | Usable as delivered |
| 12 | Today screen (totals, edit, delete) | 35B (High) | Usable after small fixes; falsely reported a clean build |
| 13 | `join_household` switch (SQL + DB tests) | 27B tuned (High) | Correct SQL; added 1 missing test. 1 h 5 min |
| 14 | "Join your partner's household" on the Us page | 35B (High) | Usable as delivered. 3 min |
| 15 | Recent foods on Add food | 35B (High) | Usable as delivered. 4 min |
| 15b | `friendlyError` tests (side trial, alongside 15) | 4B on the 3050, headless | Test file correct; the run broke on my worktree setup (see note 15) |
| 16 | Favorite foods (star, Favorites list) | 35B (High) | Silent stop, finished after "continue"; empty-state logic fixed. ~12 min |
| 17 | Custom foods (form, validator) | 35B (High), 4B as its subagent | Delegation started, but the 35B wrote the 4B's part itself; form fixes. ~5 min |
| 18 | Barcode scanning (camera, typed code, Open Food Facts lookup) | 35B (High), 4B as its subagent | The 35B interrupted the 4B and wrote its part; camera-handling fixes. ~20 min |
| 19 | Open Food Facts serving labels without repeated grams | 35B (High) | Usable as delivered; its integration test caught its own bug. ~4 min |
| 20 | Search ranking (cooking words, merged ranking) | 35B (High) | Usable after a one-line fix; it caught my brief's title-case slip. ~9 min |
| 21 | Meal prep week view and form (8 sections) | 35B (High) | Usable after real fixes (form errors, label). ~20 min |
| 22 | Grocery list, Plan/Grocery switch, Realtime on `meal_prep` | 35B (High) | Usable as delivered. ~8 min |
| 22a | Grocery helper (side job, alongside 21) | 4B on the 3050, headless | Failed: spawn EPERM in the headless sandbox, edited `vite.config.ts`, 8/9 tests failing |
| 23 | Prep dishes as custom foods, Log a serving | 35B (High) | Usable after two small fixes (select value, errors together). ~13 min |
| 24 | Shared weekly menu (grid, slot editor, Today card) | 35B (High) | Usable after fixes (grid rows, lost loading states, slot validation). ~14 min, 6 lost to JSX |
| 25 | Past days on Today, log to them, Copy yesterday | 35B (High) | Usable after two small fixes (double copy, heading). ~10 min |
| 26 | More nutrients (11 label nutrients, USDA + OFF, Today panel) | 35B (High) | Usable after a one-character fix (2014 in JSX text). ~10 min |
| 27 | Extra-nutrient inputs on custom foods and dishes | 35B (High), shared session with 28 | Usable after real fixes: the custom form was left half done, plus a wrong serving scale. ~8 min for both |
| 28 | Search finds the household's own foods | 35B (High), shared session with 27 | Usable as delivered |
| 29 | "cal" wording, Menu first, editing goals | 35B (High) | Usable after small fixes (label layout, stuck Saving). ~8 min |
| 30 | Copy to other days, Repeat last week | 35B (High) | Usable after small fixes (hook after an early return, `as any`); it overwrote the review note. ~8 min |
| 31 | Send to Keep (share sheet, clear the list) | 35B (High) | Usable after small fixes (no try/catch on the send). ~5 min; the docs ban held |
| 32 | `.ics` builder (pure logic, 22 tests) | 27B tuned (High), overnight | Usable as delivered. ~1 h 10 min; it fixed its own missing END:VEVENT |
| 33 | Activity planner (Plan tab, both people) | 35B (High) | Usable after small fixes (a copied helper instead of the tested one). ~15 min |
| 34 | Export week (activities to .ics, share or download) | 35B (High) | Usable after small fixes (a hook after an early return again; text-matching for colour). ~8 min |
| 35 | Nutrition Facts label on the food screen | 35B (High), headless, no npm | Usable after a tidy-up (three copied maps into one table). ~7 min |
| 36 | The day's totals as a label (Today) | 35B (High), headless, no npm | Usable after small fixes (one type error it couldn't see; loose map types). ~10 min |
| 37 | Live label preview in the food and dish forms | 35B (High), headless, no npm | Usable after a one-line fix (kcal not rounded; the test caught it). ~7 min |

## Lessons That Change How Briefs Are Written
These come from the review notes and override the earlier guesses above where they differ.
- **Model roles in practice:**
  - **The 35B at High** is the default for spec-following work.
  - **The 27B** is for security-critical SQL, and as the second attempt when the 35B fails a long task.
  - **Swift** is a faster second opinion that misses subtle issues.
  - **Always set the effort level.** The 35B's "Default" in the web profile means Low.
- **Supply real data.** When outside data is involved, Claude downloads real fixtures first (`scripts/save-food-fixtures.mjs`), and the brief forbids downloading or inventing them. The 35B fabricated fixtures when the network failed.
- **Check external URLs live, from a browser origin, before putting them in a brief.** Open Food Facts search works from scripts but is blocked by CORS in browsers.
- **Write state rules as rules,** e.g. "`loading` must stay true until the first load finishes". When they were written that way (task 08), the 35B got them right.
- **Long files need explicit writing steps:** a skeleton with a `// ADD TESTS HERE` marker, then one edit per group.
- **Every UI task gets a click-through** against `scripts/dev/mock-supabase.mjs`. The 35B's React wiring bugs (a button with no handler, a wrong link) are invisible to the build.
- **Mutation-check any "must never" rule.** A test named after the API-key rule couldn't fail.
- **Its self-reports misquote the brief at times.** Check every claim against the code.
- **Its "build passes" can be false** (task 12: two TypeScript errors). Ask it to paste the last lines of `npm run build`, and always rebuild before reviewing.
- **The 4B on the RTX 3050 can run alongside the big model** (its own Ollama on port 11435, not the swap proxy), but only on tiny one-file jobs in a separate worktree with its own `npm ci`. **Never link `node_modules` into a worktree with a junction:** the sandbox blocks it, and `git worktree remove --force` deletes through it.
- **Don't let the 35B delegate to the 4B** (tasks 17–18). Its `subagent` tool works, but the 35B won't wait:
  - in task 17 it wrote the 4B's files itself
  - in task 18 it **interrupted** the 4B "because it seems slow", although the brief forbade exactly that
  
  Run 3050 side jobs **headless from Claude**, in their own worktree with their own `npm ci`. What did help: giving the subagent its own short brief (no "delegate" step) and banning output files.
- **Headless runs can't start processes** (22a). The headless profile's Workspace Write sandbox gives `spawn EPERM` to vitest, even in a worktree with its own `node_modules`, so a headless 4B can't run its tests. Blocked like that, the 4B edited `vite.config.ts` and still left 8 of 9 tests failing. Until the headless sandbox is changed (with the user's OK), don't give the 4B side jobs.
- **A brief twice the usual size works** (task 21: 8 sections, ~20 min, all present), but **UI behaviour still needs exact steps**. It edited a test to match its own output, so briefs say "never change a test's expected value to make it pass".
- **For screens with several list states, put a truth table in the brief** (which lists are empty → what shows). Task 16's prose conditions were misread, and the model then reported them as met.
- **Say "never edit files under docs/"** (task 30: it wrote its report into the brief's own note file).
- **A "Completed" with no report is a silent stop.** Check its to-do count; "continue" in the same session finished it.
- **Pointing the model at the brief file works** ("Your task is in `docs/review/NN-….md`; read that whole file first"), so the brief doesn't need pasting into the chat box.

## Unattended headless runs (from task 35)
- **Command** (from the Calbud folder, Git Bash):
  - Set `DSH_HOME=…/deepseek-harness/home` and `OLLAMA_LOCAL_API_KEY=ollama`.
  - Run `dsh.cmd --profile headless --patch …/deepseek-harness/calbud-local.yml headless --json "<the usual one-line pointer to the brief>" > run.jsonl`.
  - Start it in the background, so Claude is notified when it exits.
- **Sandbox:** the default workspace-write sandbox lets the model write files but blocks npm, npx and node (EPERM). Setting `DSH_PERMISSION_MODE=danger-full-access` would lift the block, but Claude's auto-mode classifier refuses to start a full-access agent. So the brief says "you cannot run npm; don't work around it", and Claude runs `tsc`, the tests and the build afterwards.
- **Overlay:** `calbud-local.yml` now has the 35B at a 16K reply budget with a `compaction-basic` block, like the web profile.
- **Results (35–37):** 7–10 min each. Every run stayed in scope, and each needed one small fix. The model can't see type errors or test failures, so always run `npx tsc -b` and `npm test` first.
