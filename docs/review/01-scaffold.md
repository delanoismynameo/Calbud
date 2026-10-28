# 01: Scaffold the app

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`. It currently holds only `GAME_PLAN.md`, `docs/` and `.gitignore`. Your job is to scaffold the front-end app in this folder. Do **only** what is listed here.

### Read only these files
- This file.
- Nothing else is needed. Do not read `GAME_PLAN.md` or anything in `docs/` other than this file.

### Build this
Use npm (Node 24 is installed). Install the current versions of these packages:
- Vite 8 with React 19 and TypeScript (`vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `typescript`, `@types/react`, `@types/react-dom`)
- Tailwind CSS 4 through its Vite plugin (`tailwindcss`, `@tailwindcss/vite`). No `tailwind.config.js` and no PostCSS config; Tailwind 4 doesn't need them. `src/index.css` contains `@import "tailwindcss";`.
- React Router 8 (`react-router`), using **`HashRouter`**
- `vite-plugin-pwa`

Create these files (create them by hand; do not run `npm create vite`, since it refuses non-empty folders):
1. `package.json`: name `calbud`, `"type": "module"`, scripts `dev` (`vite`), `build` (`tsc -b && vite build`), `preview` (`vite preview`).
2. `tsconfig.json`: strict mode, `jsx: react-jsx`, `moduleResolution: bundler`, `noEmit: true`, includes `src` and `vite.config.ts`.
3. `vite.config.ts`:
   - plugins: react, tailwindcss, VitePWA.
   - `base: process.env.BASE_PATH ?? '/Calbud/'` (the GitHub Pages repo path).
   - VitePWA with `registerType: 'prompt'` and a manifest: name `Calbud`, short_name `Calbud`, `start_url: './'`, `scope: './'`, `display: 'standalone'`, theme and background color `#0f172a`, one icon `icon.svg` with `sizes: 'any'`, `type: 'image/svg+xml'`, `purpose: 'any'`.
4. `index.html`: standard Vite entry with `<div id="root">`, a viewport meta tag, `<meta name="theme-color" content="#0f172a">`, and `<link rel="icon" href="icon.svg">`.
5. `public/icon.svg`: a simple placeholder icon (a rounded square with the letter C is fine).
6. `src/main.tsx`: renders `<App />` inside `HashRouter`.
7. `src/App.tsx`: a mobile-first layout with a bottom nav bar and four routes, each a placeholder page component showing its title:
   - `/` → Today (`src/pages/Today.tsx`)
   - `/prep` → Meal Prep (`src/pages/Prep.tsx`)
   - `/plan` → Week Plan (`src/pages/Plan.tsx`)
   - `/us` → Us (`src/pages/Us.tsx`)
   Use Tailwind classes for styling. Keep it plain; this is a shell.
8. `src/index.css` as described above.
9. `src/vite-env.d.ts` with `/// <reference types="vite/client" />` and `/// <reference types="vite-plugin-pwa/client" />`.

### Rules
- Write files in small pieces, no more than about 100 lines per write.
- Do **not** run `npm run dev` or `npm run preview`. They never exit and will hang the session.
- Do **not** run any git commands.
- Do **not** add Supabase, a food API, or any feature beyond the placeholder pages.
- Do **not** change `GAME_PLAN.md`, `.gitignore`, or anything in `docs/`.

### Done when
1. `npm run build` finishes with no errors.
2. `dist/manifest.webmanifest` exists and contains `"start_url":"./"` and `"scope":"./"`.
3. `dist/sw.js` exists.
4. `dist/index.html` references its scripts under `/Calbud/`.

Run `npm run build` yourself, check those four points, fix anything that fails, then reply with a short summary of what you created and the result of each check.

## Run
- Model / effort: `qwen3.6:35b-a3b-128k`, High, via the web UI (Calbud workspace, session "Execute Scaffold Brief Instructions")
- Wall time: 6 min 45 s, 25 steps, ~77 tok/s, 385K tokens (95% cache hits)
- Outcome: finished. One stop: `npm install` hit the sandbox (npm's global cache is outside the workspace), the model asked for full access, and the user approved it once. The harness has since been switched to full access.
- Harness output committed unchanged as `f44edee`.

## Result
- Builds: yes, also from a clean `dist/`.
- All four done checks independently confirmed: `start_url` and `scope` are `./`, `dist/sw.js` exists, and scripts load from `/Calbud/`.
- It followed the rules: it touched only the listed files, used no git, didn't run the dev server and added no extra features. It also correctly skipped `npm create vite`.

## What I changed
- `src/App.tsx`: **bug.** The bottom nav used plain `<a href="/prep">` links. Those bypass the router and, on GitHub Pages, go to `<user>.github.io/prep` (404) instead of `/Calbud/#/prep`. Replaced them with `NavLink` from a small `tabs` list, which also gives an active-tab highlight. Verified in a browser on `vite preview`: clicking Prep goes to `/Calbud/#/prep` and renders Meal Prep.
- `tsconfig.json`: `"types": ["node"]` sat at the top level, where TypeScript ignores it. Moved it into `compilerOptions`.
- `package.json`: build tools (Vite, Tailwind, TypeScript, plugins, `@types/*`) were all under `dependencies`. Moved them to `devDependencies`, so only React, React DOM and React Router remain runtime dependencies. Pinned `@types/node` exactly like everything else, instead of `^`.
- `.gitignore`: added `*.tsbuildinfo` (`tsc -b` writes it to the project root).
- Added `.claude/launch.json` with a `vite preview` entry for browser checks.

## How I would have done it
Mostly the same file set; the brief was prescriptive. Differences:
- Navigation through `NavLink` from the start. This is the one real bug, and it's the kind a build can't catch: everything compiles, and it only breaks once deployed under a subpath.
- Split runtime from dev dependencies at install time (`npm i react react-dom react-router` then `npm i -D ...`).
- A two-file tsconfig (`tsconfig.app.json` for `src` with DOM types, `tsconfig.node.json` for `vite.config.ts` with Node types). That keeps `process` and other Node globals out of browser code. Not worth the churn at this size, so I left a single file.
- Would have opened the built app once to click the nav, which is the step that catches bugs like the first one.

## Verdict
Usable after small fixes. Fast and rule-following. One routing bug and some package hygiene. **Lesson for future briefs:** the done checks were all build-time. Add a behaviour check the model can't satisfy by building alone (e.g. "links must use `Link`/`NavLink`; no `<a href>` to internal routes"), and keep the browser click-through as my own step, since the harness can't run a dev server.
