# 49: An "Install app" button (where the browser allows it)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 installable web app. The Us page shows a line of text on how to install the app (`installHint` / `installText` from `src/pwa/install.ts`). Chrome, Edge and Samsung Internet on Android (and desktop Chrome) let a page offer installation itself.

**How the browser offers it:**
1. It fires a `beforeinstallprompt` event once, early, while the page loads.
2. The page calls `preventDefault()` on it and keeps it.
3. Later, calling the event's `prompt()` shows the browser's own install dialog.
4. Its `userChoice` promise then says `'accepted'` or `'dismissed'`. An event can be used **only once**.
5. After an install, the browser fires `appinstalled`.

Safari (iPhone) never fires it, so the text stays there.

This task:
- catches that event from the moment the app starts;
- shows an **Install app** button on the Us page while it's available;
- falls back to the existing text otherwise.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Check your work by reading it. The reviewer runs the type check, `npm test` and `npm run build`, and checks it in a browser afterwards.

### Read only these files
- This file.
- `src/main.tsx`, `src/pages/Us.tsx`, `src/pwa/install.ts`, `src/lib/useOnline.ts` (the `useSyncExternalStore` pattern to copy).
- The first 20 lines of `src/pwa/install.test.ts`, for the test style.

### 1. `src/pwa/installPrompt.ts` (new)
```ts
// The parts of Chrome's beforeinstallprompt event that are used (it isn't in TypeScript's DOM types).
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallPrompt {
  canInstall: () => boolean                    // an event is being kept
  subscribe: (listener: () => void) => () => void   // called whenever canInstall may have changed; returns an unsubscribe function
  prompt: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

// Starts listening on `target` straight away:
//  'beforeinstallprompt': call event.preventDefault(), keep the event, notify the listeners.
//  'appinstalled': forget the kept event, notify.
// prompt(): no kept event → 'unavailable'. Otherwise take the kept event, forget it (it works only once), notify,
//  then await event.prompt() and return (await event.userChoice).outcome.
export function createInstallPrompt(target: EventTarget): InstallPrompt
```

### 2. `src/pwa/installPrompt.test.ts` (new): one `it` each
Use `const target = new EventTarget()` and a helper that makes a fake event:
```ts
function fakeEvent(outcome: 'accepted' | 'dismissed') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as InstallPromptEvent
  const prompt = vi.fn(async () => {})
  Object.assign(e, { prompt, userChoice: Promise.resolve({ outcome }) })
  return { e, prompt }
}
```
1. Before any event, `canInstall()` is false and `await prompt()` is `'unavailable'`.
2. After `target.dispatchEvent(e)`: `e.defaultPrevented` is true, `canInstall()` is true, and a subscribed listener was called once.
3. `await prompt()` with an `'accepted'` event returns `'accepted'`, calls the event's `prompt` once, and afterwards `canInstall()` is false.
4. With a `'dismissed'` event: `'dismissed'`, and `canInstall()` is false afterwards (an event works only once). A second `await prompt()` gives `'unavailable'`.
5. After a `beforeinstallprompt` and then `target.dispatchEvent(new Event('appinstalled'))`: `canInstall()` is false, and the listener was called twice.
6. After `unsubscribe()`, a new event no longer calls that listener.

**Never change a test's expected value to make it pass.**

### 3. `src/pwa/installPromptInstance.ts` (new)
```ts
import { useSyncExternalStore } from 'react'
import { createInstallPrompt } from './installPrompt'

// One per app. main.tsx imports this file first, so it listens before Chrome fires the event.
export const installPrompt = createInstallPrompt(window)

export function useCanInstall(): boolean {
  return useSyncExternalStore(installPrompt.subscribe, installPrompt.canInstall, () => false)
}
```
Write it exactly like this.

### 4. `src/main.tsx`
- Add `import './pwa/installPromptInstance'` as the **first** import line. Change nothing else.

### 5. `src/pages/Us.tsx`
- Add `const canInstall = useCanInstall()` at the top, with the other hooks (before the `standalone` and `hint` lines).
- Replace the current hint paragraph block (`{hint !== null && (<p …>{installText(hint)}</p>)}`) with:
  - when `canInstall` is true: a button `type="button"`, `mt-3 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold`, text `Install app`, `onClick={() => { void installPrompt.prompt() }}`;
  - otherwise, the same hint paragraph as now (only when `hint !== null`).
- Work out which one to show as a plain variable before the `return` if that keeps the JSX simple. Change nothing else on the page.

### Rules
- **Files:**
  - create only `src/pwa/installPrompt.ts`, `src/pwa/installPrompt.test.ts` and `src/pwa/installPromptInstance.ts`
  - change only `src/main.tsx` and `src/pages/Us.tsx`
  - **never edit any file under `docs/`**
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **No `useEffect`, `useMemo` or `useCallback`.** `installPrompt.ts` must not touch `window` (it only uses the `target` it is given), so the tests can run without a browser.
- Use `import type` for types. Import `vi` from `vitest` in the test.

### Done when
1. The files above are written as described.
2. You have re-read this brief and checked every test's expected value against your code by hand.

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.
