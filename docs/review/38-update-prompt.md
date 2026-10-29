# 38: "A new version is ready" prompt, and install instructions

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 installable web app (PWA). It uses `vite-plugin-pwa` with `registerType: 'prompt'` (see `vite.config.ts`), but nothing in the app ever asks to update. So a phone that has the app installed can keep running an old version after a deploy. This task adds two things:
1. A small bar that says a new version is ready, with a **Reload** button.
2. On the Us page, a line telling people how to install the app, when it isn't installed yet.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Write the code carefully and check it by reading. The reviewer runs the type check, `npm test` and `npm run build` after you finish.

### Read only these files
- This file.
- `vite.config.ts`, `src/vite-env.d.ts`, `src/App.tsx`, `src/pages/Us.tsx`.
- `src/calendar/exportWeek.ts` (only `isIosStandalone`, for the style of a user-agent check).
- The first 20 lines of `src/calendar/exportWeek.test.ts`, for the test style.

### 1. `src/vite-env.d.ts`
Add the line `/// <reference types="vite-plugin-pwa/react" />` right after the existing `vite-plugin-pwa/client` line. Change nothing else.

### 2. `src/pwa/install.ts` (new)
```ts
// How to install the app on this device, or null when it is already installed (standalone).
//  'ios': the user agent contains 'iPhone' or 'iPad', or it contains 'Macintosh' while maxTouchPoints > 1 (iPadOS says Macintosh).
//  'other': anything else.
export function installHint(userAgent: string, maxTouchPoints: number, standalone: boolean): 'ios' | 'other' | null

// The text to show for each hint.
//  'ios':   'To install Calbud: tap Share, then Add to Home Screen.'
//  'other': 'To install Calbud: open the browser menu, then Install app or Add to Home screen.'
export function installText(hint: 'ios' | 'other'): string
```

### 3. `src/pwa/install.test.ts` (new): one `it` each
1. iPhone (`'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'`, 5, false) → `'ios'`.
2. iPad that says Macintosh (`'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'`, 5, false) → `'ios'`; a real Mac (same agent, 0, false) → `'other'`.
3. Android (`'Mozilla/5.0 (Linux; Android 14)'`, 5, false) → `'other'`.
4. Already installed: the iPhone and Android agents with `standalone` true both give `null`.
5. `installText('ios')` and `installText('other')` equal the two texts above exactly.

**Never change a test's expected value to make it pass.**

### 4. `src/pwa/UpdatePrompt.tsx` (new)
```tsx
import { useRegisterSW } from 'virtual:pwa-register/react'
export default function UpdatePrompt()
```
- `const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({ onRegisteredSW(_url, registration) { … } })`
- In `onRegisteredSW`: when `registration` is defined, check for a new version every hour (`setInterval(() => { registration.update() }, 60 * 60 * 1000)`), and also whenever the page becomes visible again (a `visibilitychange` listener on `document` that calls `registration.update()` when `document.visibilityState === 'visible'`). This runs once per page load, so there is no cleanup.
- When `needRefresh` is false: render `null` (after the hook call, never before it).
- Otherwise render a bar fixed just above the bottom tab bar: `fixed bottom-16 inset-x-0 z-20 px-4`. Inside it, a `max-w-md mx-auto bg-blue-700 text-white rounded-lg shadow-xl p-3 flex items-center gap-3` box holding:
  - a `flex-1 text-sm` text: `A new version of Calbud is ready.`
  - a **Reload** button (`type="button"`, `bg-white text-blue-700 font-semibold rounded px-3 py-2 text-sm`) that calls `updateServiceWorker(true)`.
  - a **Later** button (`type="button"`, `text-sm text-blue-100 underline`) that calls `setNeedRefresh(false)`.
- **No `useMemo` or `useCallback`.** Plain arrow functions in `onClick`.

### 5. `src/App.tsx`
- In `SignedInApp`'s main return (the one with the header and the bottom tabs), render `<UpdatePrompt />` as the last child of the outer `div`. Add the import. Change nothing else.

### 6. `src/pages/Us.tsx`
- Work out before the `return`, as plain variables:
  `const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true`
  `const hint = installHint(navigator.userAgent, navigator.maxTouchPoints, standalone)`
- Inside the signed-in part, right after the Sign out button, when `hint` is not null: `<p className="mt-3 text-xs text-gray-400 max-w-sm mx-auto">{installText(hint)}</p>`.
- Change nothing else.

### Rules
- **Files:**
  - create only `src/pwa/install.ts`, `src/pwa/install.test.ts` and `src/pwa/UpdatePrompt.tsx`
  - change only `src/vite-env.d.ts`, `src/App.tsx` and `src/pages/Us.tsx`
  - **never edit any file under `docs/`**, and do not change `vite.config.ts`
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Use `import type` for types.

### Done when
1. The files above are written as described.
2. You have re-read this brief and checked every test's expected value against your code by hand.

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, headless in the workspace-write sandbox (no npm).
- **Wall time:** about **4 min**, 17 steps. It stayed inside the brief's files.
- **Outcome:** finished, and it reported "no uncertainties".

## Result
- **Type check:** clean. **Tests:** 328 passing (322 + 6). **Build:** clean. The build adds no second `registerSW` script, because the plugin sees the virtual import.
- **Click-through** against the mock, using the built app and its real service worker:
  - **Detecting the update:** I loaded the app, let the worker take control, then changed `dist/sw.js` on disk to stand in for a deploy. Making the page visible again showed "A new version of Calbud is ready." with **Reload** and **Later**, just above the tab bar at 375 px.
  - **Reload:** activated the new worker and reloaded the page, and the bar was gone afterwards.
  - **Install hint:** the Us page shows the line for a non-iOS browser under Sign out.
- **Not tested:** the hourly check, and the iPhone and Android installed apps. Those need your phones.

## What I changed
- **`installHint`:** it checked for 'iPhone' but not 'iPad', which the brief asked for. Older iPads report 'iPad', so I added it.

## Verdict
Usable after a one-word fix. Short, exact briefs keep working well headless.
