# 50a: Theme switch (redesign)

Read `docs/review/redesign-common.md` first and follow it (the colour rules do not matter here except in `ThemeToggle.tsx`). Task 50 created the colors for both themes in `src/index.css`, in the `:root.dark` block. This task decides which one is active: System, Light or Dark.

## Files
New: `src/ui/theme.ts`, `src/ui/theme.test.ts`, `src/ui/useTheme.ts`, `src/ui/ThemeToggle.tsx`. Edit: `index.html`, `src/main.tsx`.

## Steps
1. **`src/ui/theme.ts`** with these exports:
```ts
export type ThemePref = 'system' | 'light' | 'dark'
export const THEME_KEY = 'calbud-theme'
export function parseTheme(raw: string | null | undefined): ThemePref  // only 'light' and 'dark' pass; anything else gives 'system'
export function resolveTheme(pref: ThemePref, systemDark: boolean): 'light' | 'dark'
export function loadTheme(): ThemePref   // reads localStorage inside try/catch, then parseTheme
export function saveTheme(pref: ThemePref): void  // writes localStorage inside try/catch
export function applyTheme(pref: ThemePref): void // adds/removes class 'dark' on document.documentElement; systemDark comes from matchMedia('(prefers-color-scheme: dark)').matches
export function initTheme(): void  // applyTheme(loadTheme()), then listens for the media query 'change' event and re-applies loadTheme() (so System follows the phone)
```
2. **`src/ui/theme.test.ts`** (vitest, like other `*.test.ts` files): test only `parseTheme` and `resolveTheme`. parseTheme of `'dark'`, `'light'`, `'system'`, `'x'`, `''`, `null`, `undefined`; resolveTheme for all three prefs with systemDark true and false (6 cases). Do not test the localStorage functions.
3. **`src/ui/useTheme.ts`:** `useTheme()` returns `[pref, setPref]`. State starts at `loadTheme()`; `setPref` calls `saveTheme`, `applyTheme` and sets state.
4. **`src/ui/ThemeToggle.tsx`:** a card `bg-card rounded-3xl shadow-card p-5` with a heading `Appearance` (`text-[13px] font-bold uppercase tracking-[1.5px] text-section mb-3`) above a three-button segmented control labelled System, Light, Dark, inside a track `flex rounded-2xl bg-coral-light p-1`. The selected button is `flex-1 rounded-xl bg-card text-ink shadow-card font-bold py-2`; the others are `flex-1 py-2 text-muted`. Each button has `type="button"` and `aria-pressed`. Do **not** add it to the Us page: task 62 does that.
5. **`src/main.tsx`:** import `initTheme` and call it once before `createRoot`.
6. **`index.html`:** (a) in `<head>`, before `<title>`, add this inline script exactly, so the right theme is set before the app loads:
`<script>try{var p=localStorage.getItem('calbud-theme');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}</script>`
(b) replace the single `theme-color` meta with two: `<meta name="theme-color" content="#fffaf5" media="(prefers-color-scheme: light)" />` and `<meta name="theme-color" content="#1b1512" media="(prefers-color-scheme: dark)" />`.

## Done means
- `npx tsc -b` passes; `npm test` passes, with the new `theme.test.ts` cases added to the previous count.
- The reply format in `redesign-common.md`.
