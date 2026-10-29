# 48: An "offline" banner

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 installable web app. With no connection, the app still opens (its files are cached), but nothing can load or save, and today nothing says why. Add a small banner under the header that shows only while the device is offline.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Check your work by reading it. The reviewer runs the type check, `npm test` and `npm run build`, and checks it in a browser afterwards.

### Read only these files
- This file.
- `src/App.tsx` (only `SignedInApp`), `src/pwa/UpdatePrompt.tsx` (for the style of a small component).

### 1. `src/lib/useOnline.ts` (new)
```ts
import { useSyncExternalStore } from 'react'

// True while the browser says it is online. Re-renders on the window's 'online' and 'offline' events.
export function useOnline(): boolean
```
Use `useSyncExternalStore(subscribe, () => navigator.onLine, () => true)`. `subscribe(callback)` adds `callback` as a listener for both `'online'` and `'offline'` on `window`, and returns a function that removes both. Define `subscribe` at module level, outside the hook, so it is the same function on every render.

### 2. `src/pwa/OfflineBanner.tsx` (new)
```tsx
export default function OfflineBanner()
```
- `const online = useOnline()` first. Then, when `online`, return `null`.
- Otherwise: `<div role="status" className="bg-amber-900 text-amber-100 text-sm text-center px-4 py-2">You're offline. Calbud needs a connection to load and save; it will catch up when you're back.</div>`.

### 3. `src/App.tsx`
- In `SignedInApp`'s main return, render `<OfflineBanner />` right after the closing `</header>` tag. Add the import. Change nothing else.

### Rules
- **Files:**
  - create only `src/lib/useOnline.ts` and `src/pwa/OfflineBanner.tsx`
  - change only `src/App.tsx`
  - **never edit any file under `docs/`**
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **No `useEffect`, `useMemo` or `useCallback`.**

### Done when
1. The files above are written as described.
2. You have re-read this brief and checked each part against your code.

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.
