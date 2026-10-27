# Calbud Build Workflow: Local Harness Builds, Claude Reviews

The DeepSeek Harness (`dsh`) with local models does the implementation. Claude writes each task brief, waits until the harness has finished, then reviews and corrects the output. Every task gets a review note in this folder that records what Claude would have done differently.

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

## How I would have done it
<Claude's approach: structure, key decisions, and where it differs from the harness output>

## Verdict
Usable as-is / usable after small fixes / rewritten. One-line lesson for future briefs.
```

---

## Setup Needed Before Task 01

- [x] `git init` in the Calbud folder, with one commit for the plan docs, so every harness run has a clean diff.
- [x] Calbud workspace in the harness: already exists (`Documents\Calbud`, created 2026-10-27, one session).
- [x] Local-model overlay `local-llm-tools\deepseek-harness\calbud-local.yml` (instead of a separate profile): 35B default, swap proxy, web profile's search settings.
- [ ] The swap proxy running (`start-deepseek-harness.bat` starts it; a headless run needs it started separately).
- [x] Smoke test (2026-10-27): the 35B created `smoke-test.txt` with "ok" in 42 s, two steps, no extra files touched. The session was saved under `home\sessions\--C-Users-orgo1-Documents-Calbud--\` but not added to the Calbud workspace's session list, so it may not show in the web view.

## Planned Task Order (Phase 1 of GAME_PLAN.md)

| # | Task | First model |
|---|---|---|
| 01 | Scaffold Vite + React + TS + Tailwind + PWA plugin, HashRouter, `base` path | 35B |
| 02 | GitHub Actions deploy workflow for Pages | 35B |
| 03 | Supabase migration: tables only | 35B |
| 04 | Supabase migration: RLS, profile trigger, household functions | 27B vs Swift head-to-head |
| 05 | RLS test script (three users) | 35B |
| 06 | Supabase client (PKCE) + auth screens | 35B |
| 07 | Household wizard and join flow | 35B |
