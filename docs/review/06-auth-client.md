# 06: Supabase client (PKCE) and sign-in screens

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app that uses React Router's **HashRouter**. Your job is to connect it to Supabase Auth with **email + password** and add the sign-in screens. Do **only** what is listed here. The household wizard is a later task: after signing in, users just see the existing app.

### Read only these files
- This file.
- `package.json`, `src/main.tsx`, `src/App.tsx`, `src/pages/Us.tsx`, `src/vite-env.d.ts`, `.github/workflows/deploy.yml`.

Do not read the other pages, `GAME_PLAN.md`, the `docs/` folder (except this file), or `supabase/`.

### Why PKCE matters here
The app uses HashRouter, so its URLs look like `https://<user>.github.io/Calbud/#/prep`. Supabase's default sign-in flow puts tokens in the URL `#hash`, which would clash with the router. In **PKCE** mode, Supabase sends the user back with `?code=...` in the **query string** instead (e.g. `https://<user>.github.io/Calbud/?code=abc#/`), and `supabase-js` swaps that code for a session automatically when `detectSessionInUrl` is true.

### Install
`npm install --save-exact @supabase/supabase-js`. That is the only new dependency. No UI libraries and no TanStack Query yet.

### Create these files
Each file has one job. Keep each under about 120 lines; if a file would be longer, split it into a second file.

**1. `src/lib/env.ts`**
- Reads `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`.
- Exports `supabaseUrl`, `supabaseKey` (both `string`) and `isConfigured` (`true` only when both are non-empty).
- It must **not throw** when they are missing.

**2. `src/lib/supabase.ts`**
- Exports `supabase`, created with `createClient(supabaseUrl, supabaseKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })`.
- When `isConfigured` is false, pass the placeholders `'http://localhost'` and `'missing-key'`, so importing the file never crashes. The app shows a setup message instead (see `App.tsx` below).
- Exports `authRedirectUrl()`, which returns `window.location.origin + import.meta.env.BASE_URL`. This is the URL emails send users back to: no hash and no path after the base.

**3. `src/auth/AuthProvider.tsx`**
A React context, plus a hook `useAuth()` that returns:
- `session` (`Session | null`)
- `loading` (`true` until the first session check finishes)
- `recovery` (`true` after a `PASSWORD_RECOVERY` event, until the password is changed)
- `urlNotice` (`string | null`, see below)
- `clearRecovery()`

Rules:
- On mount, call `supabase.auth.getSession()` once, and subscribe with `supabase.auth.onAuthStateChange`. **Unsubscribe on unmount.**
- Inside the `onAuthStateChange` callback, only call `setState`. **Never `await` another `supabase` call in it**, because supabase-js can deadlock.
- After the first `getSession()` resolves, look at `window.location.search`:
  - If it contains `error_description`, set `urlNotice` to that text.
  - Else if it contains `code` but there is still no session, set `urlNotice` to `Your email is confirmed. Sign in to continue.` (This happens when someone opens the confirmation email in a different browser.)
  - In both cases, remove the query string while keeping the hash: `history.replaceState(null, '', window.location.pathname + window.location.hash)`.

**4. `src/auth/AuthScreen.tsx`**
One screen with three modes, switched by small text buttons: **Sign in**, **Create account** and **Forgot password**.
- **Sign in:** email and password, calling `supabase.auth.signInWithPassword`.
- **Create account:**
  - Fields: display name, email, password (at least 8 characters, checked before sending).
  - Calls `supabase.auth.signUp({ email, password, options: { data: { display_name }, emailRedirectTo: authRedirectUrl() } })`.
  - If the result has a session, the user is in. Otherwise show `Check your email to confirm your account.`
- **Forgot password:** email only, calling `supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() })`. Then show `If that email has an account, a reset link is on its way.` Show this either way, so the form never reveals whether an account exists.
- Show the `urlNotice` from `useAuth()` above the form when it is set.
- Show Supabase's error message in red under the form. Disable the submit button while a request is running.
- Use proper `<form onSubmit>` handling, `<label>`s, `type="email"` / `type="password"`, and `autoComplete` values (`email`, `current-password`, `new-password`, `name`).

**5. `src/auth/ResetPassword.tsx`**
Shown when `recovery` is true:
- Fields: new password and confirm password, with a minimum of 8 characters and both matching.
- Calls `supabase.auth.updateUser({ password })`, then `clearRecovery()`.
- Shows errors like `AuthScreen` does.

**6. `.env.example`**
The two variable names with empty values and a one-line comment for each:
- `VITE_SUPABASE_URL=`
- `VITE_SUPABASE_PUBLISHABLE_KEY=`

### Change these files
- **`src/vite-env.d.ts`:** add an `ImportMetaEnv` interface with the two variables as `readonly ... : string`, and the matching `ImportMeta` interface. Keep the two existing reference lines.
- **`src/main.tsx`:** wrap `<App />` in `<AuthProvider>`, inside the `HashRouter`.
- **`src/App.tsx`:** keep the existing layout, tabs and routes. Before rendering them, choose what to show, in this order:
  1. `!isConfigured`: a centred message, `Supabase isn't configured. Copy .env.example to .env.local and fill in the two values.`
  2. `loading`: a centred `Loading…`.
  3. `recovery`: `<ResetPassword />`.
  4. no `session`: `<AuthScreen />`.
  5. otherwise: the existing app, unchanged.
- **`src/pages/Us.tsx`:** below the existing text, show `Signed in as <email>` and a **Sign out** button that calls `supabase.auth.signOut()`.
- **`.github/workflows/deploy.yml`:** in the **Build** step's `env:`, add `VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}` and `VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}`. Change nothing else in that file.

### Style
Match the existing look: dark `bg-slate-900` page, `bg-slate-800` panels, white text, `text-gray-400` for secondary text. Make forms full-width on a phone, with a `max-w-sm` centred card on wider screens, and inputs at least 44px tall.

### Rules
- TypeScript, function components and hooks only. Import types from `@supabase/supabase-js` (`Session`, `AuthChangeEvent`).
- Write **one file per write**. Edit existing files with small `edit`s, never by rewriting them.
- Never put a real URL or key in any file. Do **not** create `.env` or `.env.local`.
- Do **not** change any file not listed above (except `package-lock.json` from `npm install`). Do **not** run any git commands.

### Done when
1. `npm run build` succeeds with no TypeScript errors. Run it, and fix errors until it passes.
2. `npm run test:db` still prints `31 passed, 0 failed` (this task shouldn't affect it).
3. You have re-read this brief section by section and confirmed every file and behaviour is there.

Reply with: the files created and changed, the build result, and anything you were unsure about.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High** effort, chosen on purpose. Its "Default" in the web profile means Low. Run via the web UI with Full access (enabled by the user).
- **Context:** the first 35B run after the compaction fix from 2026-10-28. It reached 30% of the listed 176K window, with no compactions.
- **Wall time:** **8 min 58 s**, 66 steps, 2M tokens, ~72 tok/s.
- **Outcome:** finished with a clear file table, ran `npm run build` and `npm run test:db` (both passing), and reported "None" under doubts.
- **Saved:** harness output committed unchanged as `7d63d68`.

## Result
Every file in the brief was created or changed, nothing else was touched, and no keys or `.env` files were written. supabase-js was pinned at `2.118.0`. The build passes, and `npm run test:db` still prints 31/31.

On reading the code, I found three problems the build couldn't catch:
1. **Password reset could never reach the "Set new password" screen.** `AuthScreen` called `clearRecovery()` in an unmount cleanup, and again on every submit. A reset link fires `PASSWORD_RECOVERY` together with a new session, so the sign-in screen unmounts and immediately cancels recovery. The app would then go straight in without asking for a new password.
2. **The URL was cleaned up too early.** The brief said to inspect the query string *after* the first `getSession()` resolves; the model did it synchronously in the effect. supabase-js reads `?code=` asynchronously during its own startup, so `history.replaceState` could strip the code first, and confirming by email would then fail to sign in. There were also two smaller issues:
   - It showed "Your email is confirmed" whenever a code was present, even when the exchange succeeded.
   - It ran `decodeURIComponent` on a value `URLSearchParams` had already decoded, which throws on a literal `%`.
3. **No page background outside the main app.** Only the signed-in layout set `bg-slate-900`, so the sign-in, loading and setup screens rendered on a white page, and "Loading…" was white on white.

Minor and left as is:
- `isConfigured` is a function, not the boolean the brief named. It's harmless.
- The `.env.example` comment says "anon/public key". That's fine, since both names are in use.

## What I changed
- `AuthProvider.tsx`: moved the URL check inside the `getSession().then(...)`. The confirmation notice now shows only when there is still no session, the double decode is gone, and the query string is cleared only after supabase-js has had its chance to read it.
- `AuthScreen.tsx`: removed both `clearRecovery()` calls. Only `ResetPassword` ends recovery now, after `updateUser` succeeds.
- `index.css`: the `body` gets the slate-900 background and white text, so every screen is dark.

### Checked in the browser (local preview, service worker cleared)
- **No keys:** the setup message shows on the dark page.
- **Placeholder keys** (pointing at a dead local address, set only for the build command, never written to a file):
  - The sign-in screen renders, and all three modes switch.
  - A short password is rejected before any request is sent.
  - A sign-in against the dead server shows `Failed to fetch` in red, and the button comes back.
  - `?error_description=Email+link+is+invalid+or+has+expired#/` shows that text as the notice and cleans the URL to `/Calbud/#/`.
  - `?code=not-a-real-code#/`: when the exchange fails, it shows "Your email is confirmed. Sign in to continue." and cleans the URL.
- **Not testable yet:** real sign-up, email confirmation, sign-in, sign-out and the password-reset round trip all need a Supabase project. The reset bug above was found by reading the code. **Before relying on auth, run all four flows on the deployed Pages URL** (the game plan's build-order step 4).

## How I would have done it
The same file layout, plus:
- **Derive recovery mode from the event stream, and never clear it from the sign-in screen.** In a real project I'd also store the `PASSWORD_RECOVERY` flag in `sessionStorage`, so a refresh on the reset screen doesn't drop the user into the app.
- **One `useAuthForm` hook** for the loading, error and submit logic that `AuthScreen` and `ResetPassword` repeat, plus a shared `<Field>` component for the label, input and styling repeated five times.
- **Put the page background on `body` from the start**, rather than on each layout.
- **Write a brief line for the race explicitly:** "Do not touch `window.location` until `getSession()` has resolved". The model treated "after the first session check" as a comment, not a constraint.

## Verdict
**Usable after three small fixes. This is the fastest and cleanest 35B run so far on a multi-file task.** Lessons:
1. **The compaction fix plus High effort made the difference.** It ran 9 minutes, never compacted, and gave an accurate report, compared with task 05 run 1 (Default/Low effort, compacting at 32K: 69 minutes and unusable).
2. **A passing build is not a review.** Both real bugs are about the timing of React effects and auth events, which no type checker sees. Auth and event-ordering code always gets a careful read plus a browser check.
3. **Ordering rules in briefs need to be written as rules** ("must not ... until ..."). Phrased as an aside, they get skipped.
