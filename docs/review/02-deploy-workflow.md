# 02: GitHub Pages deploy workflow

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React app that builds with `npm run build` into `dist/`. Your job is to add a GitHub Actions workflow that builds the app and deploys it to GitHub Pages. Do **only** what is listed here.

### Read only these files
- This file.
- `package.json` and `vite.config.ts`, to see the build script and how the `base` path is set. Do not change either file.

### Background you need
- `vite.config.ts` sets `base: process.env.BASE_PATH ?? '/Calbud/'`. On GitHub Pages the site is served at `https://<user>.github.io/<repo-name>/`, so the workflow must set `BASE_PATH` to `/<repo-name>/` from the repository's actual name. Do not hard-code `Calbud`.
- Deploy with the official Pages actions (the "GitHub Actions" Pages source), **not** a `gh-pages` branch.

### Build this
Create one file: `.github/workflows/deploy.yml`.
- Name: `Deploy to GitHub Pages`.
- Triggers: `push` to the `main` branch, and `workflow_dispatch`.
- Top-level `permissions`: `contents: read`, `pages: write`, `id-token: write`.
- `concurrency`: group `pages`, `cancel-in-progress: false`.
- Job `build` on `ubuntu-latest`:
  1. `actions/checkout@v7`
  2. `actions/setup-node@v7` with `node-version: 24` and `cache: npm`
  3. `npm ci`
  4. `npm run build`, with env `BASE_PATH: /${{ github.event.repository.name }}/`
  5. `actions/configure-pages@v6`
  6. `actions/upload-pages-artifact@v5` with `path: dist`
- Job `deploy`, which `needs: build`, on `ubuntu-latest`:
  - `environment`: name `github-pages`, url `${{ steps.deployment.outputs.page_url }}`
  - one step, `actions/deploy-pages@v5`, with `id: deployment`

Use exactly these action versions.

### Rules
- Write the file in one piece; it is short.
- Do **not** run `npm run dev` or `npm run preview`. They never exit and will hang the session.
- Do **not** run any git commands.
- Do **not** change any existing file. Create only `.github/workflows/deploy.yml`.

### Done when
1. `.github/workflows/deploy.yml` exists with the triggers, permissions, concurrency, two jobs and steps listed above.
2. The `BASE_PATH` override works. In PowerShell run `$env:BASE_PATH='/test-repo/'; npm run build; Remove-Item Env:BASE_PATH`, then confirm `dist/index.html` loads its scripts from `/test-repo/` (not `/Calbud/`).
3. Then run a normal `npm run build` again and confirm `dist/index.html` is back to `/Calbud/`, so `dist/` is left in its default state.

Reply with a short summary: the file you created, and the result of each check, including the script paths you saw in `dist/index.html` both times.

## Run
- Model / effort: `qwen3.6:35b-a3b-128k`, High, via the web UI (session "Deploy Workflow Brief")
- Wall time: 1 min 57 s, 14 steps, ~74 tok/s, 196K tokens
- Outcome: finished, but **checks 2 and 3 were not run**. The session was in **Workspace Write** mode (new sessions default to it, even after full access was turned on in the task 01 session), and the sandbox blocked Node from spawning processes (EPERM). The model reported this honestly and fell back to reading `vite.config.ts`, plus quoting the old `dist/index.html`.
- Harness output committed unchanged as `3742c70`.

## Result
- `.github/workflows/deploy.yml` matches the brief exactly: triggers, permissions, concurrency, both jobs, action versions, and `BASE_PATH` from `github.event.repository.name`.
- My own run of the checks:
  - `BASE_PATH=/test-repo/` → every script, stylesheet and manifest loads from `/test-repo/`.
  - A default build goes back to `/Calbud/`.
  - `npm ci --dry-run` succeeds, so the lockfile is in sync for the workflow's `npm ci`.
- No existing files changed, and `node_modules` is intact.

## What I changed
Nothing in the code.

## How I would have done it
The same file. The brief spelled it out, and the model reproduced it without drift. The only thing I'd have added is a note for the one-time GitHub setup, which can't live in the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions** before the first push. Otherwise `configure-pages` fails on the first run.

## Verdict
Usable as-is. **Lessons for future briefs:**
1. Before sending, check that the session's permission mode is **Full access**. It is per-session and new sessions start in Workspace Write, which blocks `npm` and `node`.
2. The model handled a blocked check well: it said so and didn't claim a pass. My own run of the checks remains the real gate.
