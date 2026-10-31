# Model bench on real Calbud briefs (web UI, one builder + one reviewer per brief)

Models are registered in the harness web profile and `calbud-local.yml` (Ornith, Flint, Laguna, North Mini, Qwopus). Always set effort to High (new sessions reset it to Default).

| Brief | Builder | Time | Result | Reviewer | Reviewer verdict | My verdict on the reviewer |
|---|---|---|---|---|---|---|
| 72 dark Nutrition Facts label | Ornith 1.5 35B High | 2m 48s | All 9 class swaps correct, one file, tsc/457 tests/build pass, honest report (fixed two own slips mid-run) | Flint 40B High | FAIL (20m 23s) | Steps table right. FAIL reason wrong: it blamed the builder for the brief file, which Claude had added to the same commit. Its light-mode note (tokens are #3d2c2c / #7a6b6b, not pure black/gray) is real and fair. Slow: 20 min for a 9-line diff, 414K tokens |

Process lesson: commit the brief before the builder runs, so the reviewer's diff holds only the builder's work.
