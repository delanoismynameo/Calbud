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
