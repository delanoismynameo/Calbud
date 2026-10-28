# 07: First-run setup (profile, household, invite code)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app with Supabase Auth already working (`src/auth/`, `src/lib/supabase.ts`). Your job is the **first-run setup** a signed-in user goes through before reaching the app:
1. Set up their profile.
2. Then either **create** a household (and get an invite code to share) or **join** their partner's household with that code.

Do **only** what is listed here.

### Read only these files
- This file.
- `src/App.tsx`, `src/auth/AuthProvider.tsx`, `src/auth/AuthScreen.tsx` (for the form style), `src/lib/supabase.ts`, `src/pages/Us.tsx`.
- `supabase/migrations/20261027000001_tables.sql`: just the `households` and `profiles` tables.

Do not change anything in `supabase/`, `src/auth/` or `src/lib/supabase.ts`.

### What the database allows (already in place, don't change it)
- **`profiles`:** you can read your own row and your partner's. You may **update only these columns of your own row**: `display_name`, `color`, `goal_calories`, `goal_protein_g`, `goal_carbs_g`, `goal_fat_g`, `timezone`. Updating any other column (`id`, `household_id`, `created_at`) is rejected with a permission error, so **never include them in an update**.
- **`households`** (`id`, `name`, `invite_code`, `created_at`): you can read only your own household. There are no direct inserts or updates.
- **`supabase.rpc('create_household', { p_name })`** returns the new household's id (a uuid string). It errors if you're already in one.
- **`supabase.rpc('join_household', { p_code })`** returns the household id. Errors:
  - you're already in a household
  - no household has that code
  - the household already has 2 members

  On success, the household's invite code changes.
- **Error messages start with the function's name**, e.g. `join_household: no household has that invite code`.

### Create these files
Keep each under about 120 lines.

**1. `src/lib/types.ts`**
- A `Profile` type with every `profiles` column (uuid and timestamp as `string`, `household_id: string | null`, numbers as `number`).
- A `Household` type with every `households` column.

**2. `src/lib/errors.ts`**
`friendlyError(message: string): string`, which:
- removes a leading `create_household: ` or `join_household: `
- capitalises the first letter
- adds a final `.` if there isn't one

For example, `join_household: no household has that invite code` becomes `No household has that invite code.`

**3. `src/household/ProfileProvider.tsx`**
A context plus a hook `useProfile()` that returns:
- `profile` (`Profile | null`)
- `household` (`Household | null`)
- `partner` (`Profile | null`)
- `loading` (`boolean`)
- `error` (`string | null`)
- `refresh()` (returns `Promise<void>`)

`refresh()` uses the signed-in user's id from `useAuth().session` and does this:
1. Loads the user's own profile: `from('profiles').select('*').eq('id', userId).single()`.
2. If `household_id` is set, loads that household (`.single()`) and the partner: `from('profiles').select('*').eq('household_id', id).neq('id', userId).maybeSingle()`. Otherwise set both to `null`.
3. On any Supabase error, sets `error` to its message.

It runs on mount and whenever the user id changes. It also runs when the page becomes visible again (`document` `visibilitychange`, when `document.visibilityState === 'visible'`), so the first partner sees the second one appear after switching back to the app. **Remove that listener on unmount.**

`loading` is `true` only until the first load finishes. Later refreshes must not flip it back to `true`, or the screen would flash.

**4. `src/household/Setup.tsx`**
A two-step screen with a `Step 1 of 2` / `Step 2 of 2` label at the top and a small **Sign out** text button at the bottom (`supabase.auth.signOut()`), so nobody gets stuck. It always starts at step 1. Step 1 is `<ProfileStep onDone={() => setStep(2)} />` and step 2 is `<HouseholdStep />`. Step 2 also has a **Back** text button to step 1.

**5. `src/household/ProfileStep.tsx`**
A form prefilled from `useProfile().profile`, with these fields:
- **Display name:** required, 1–40 characters after trimming.
- **Colour:** six round swatch buttons with these colours, in this order: `#6366f1`, `#ec4899`, `#10b981`, `#f59e0b`, `#3b82f6`, `#ef4444`.
  - Each is `type="button"`, with `aria-label` set to the hex value and `aria-pressed` set when chosen.
  - The chosen one has a white ring.
  - If the profile's colour isn't in the list, the first swatch is chosen.
- **Daily goals:** four whole-number inputs (`type="number"`, `min=1`, `step=1`): Calories, Protein (g), Carbs (g), Fat (g). Each must be a whole number ≥ 1 before saving; otherwise show an error and don't send anything.

On **Continue**:
1. Run `from('profiles').update({ display_name, color, goal_calories, goal_protein_g, goal_carbs_g, goal_fat_g, timezone }).eq('id', userId)`. `timezone` is `Intl.DateTimeFormat().resolvedOptions().timeZone`.
2. Then `await refresh()`.
3. Then call `onDone()`.

Show the Supabase error in red if the update fails. Disable the button while saving.

**6. `src/household/HouseholdStep.tsx`**
Two choices, shown as two buttons at first: **Create a household** and **Join with a code**.

**Create:**
- A name field, prefilled with `<display name>'s household`. It's required.
- Calls `rpc('create_household', { p_name })`.
- On success, **do not call `refresh()` yet**, because that would leave the setup screen before the code is shown. Instead, read the new household with `from('households').select('*').eq('id', <returned id>).single()`, then show:
  - `Share this code with your partner:` and the `invite_code` in large monospace text
  - a **Copy** button using `navigator.clipboard.writeText`, which shows `Copied` for 2 seconds. If the clipboard call throws, show `Copy failed. Select the code instead.`
  - a **Done** button that calls `refresh()` (that leaves the setup screen).

**Join:**
- A code field (`autoComplete="off"`, `autoCapitalize="none"`, `spellCheck={false}`).
- On submit, send `code.trim().toLowerCase()` to `rpc('join_household', { p_code })`, then `refresh()`.
- Errors go through `friendlyError`. An empty code shows `Enter the code your partner shared.` without sending anything.

Both choices have a small **Back** text button to return to the two-button choice. Disable buttons while a request runs.

### Change these files
- **`src/App.tsx`:** keep checks 1–4 (not configured, loading, recovery, no session) exactly as they are. When there **is** a session, render the signed-in part wrapped in `<ProfileProvider>`. Inside it, choose what to show in this order:
  1. `loading`: the same centred `Loading…` as before.
  2. `error`: the error in red, with a **Retry** button that calls `refresh()`.
  3. `!profile?.household_id`: `<Setup />`.
  4. Otherwise: the existing header, routes and tab bar, unchanged.

  Put the signed-in part in its own small component in `App.tsx` (e.g. `SignedInApp`), so `useProfile()` is called inside the provider.
- **`src/pages/Us.tsx`:** keep the title and the existing **Signed in as** and **Sign out** block. Replace the placeholder text with:
  - The household name.
  - A card for **You** and one for your partner, each with a colour dot and display name.
  - If `partner` is null: `Waiting for your partner to join. Share this code:`, the household's `invite_code` in monospace, and a **Copy** button (same behaviour as in setup).

### Style
Match `AuthScreen.tsx`: a centred `max-w-sm` `bg-slate-800` card, labels in `text-gray-400`, inputs at least 44px tall, a blue primary button, and errors in `text-red-400`.

### Rules
- TypeScript, function components and hooks only. No new dependencies.
- Write **one file per write**. Change existing files with small `edit`s, never by rewriting them.
- Do **not** change any file not listed above. Do **not** run any git commands.

### Done when
1. `npm run build` passes with no TypeScript errors. Run it, and fix until it passes.
2. `npm run test:db` still prints `31 passed, 0 failed`.
3. You have re-read this brief section by section and confirmed every file and behaviour is there.

Reply with: the files created and changed, the build result, and anything you were unsure about.
