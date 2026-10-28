# 08: Move profile loading to TanStack Query

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript app using Supabase. The signed-in user's profile, household and partner are loaded by a hand-written React context in `src/household/ProfileProvider.tsx`. Your job is to replace that with **TanStack Query**, which handles loading, errors, retries and refetching when the app comes back into view. Later screens will load their data the same way.

**What users see must not change.** This is a refactor.

### Read only these files
- This file.
- `src/main.tsx`, `src/App.tsx`, `src/auth/AuthProvider.tsx`.
- `src/household/ProfileProvider.tsx`, `src/household/ProfileStep.tsx`, `src/household/HouseholdStep.tsx`, `src/household/Setup.tsx`.
- `src/pages/Us.tsx`, `src/lib/types.ts`.

### Install
`npm install --save-exact @tanstack/react-query`. That is the only new dependency.

### Create these files

**1. `src/lib/queryClient.ts`**
Exports `queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } } })`.

**2. `src/household/useProfile.ts`**
Exports a hook, `useProfile()`, with **exactly the same return shape as today**: `{ profile, household, partner, loading, error, refresh }`, with the same types. The other files keep working with only an import-path change.
- It reads the user id from `useAuth().session?.user.id`.
- It calls `useQuery` with:
  - `queryKey: ['household-data', userId]`
  - `enabled: !!userId`
  - a `queryFn` that does the same three loads as today's `refresh()`, in the same order:
    1. Own profile, with `.single()`.
    2. If `household_id` is set: the household, with `.single()`.
    3. If `household_id` is set: the partner, with `.eq('household_id', …).neq('id', userId).maybeSingle()`.

    It returns `{ profile, household, partner }`, with `household` and `partner` as `null` when there's no household. If any Supabase call returns an error, it **throws** `new Error(error.message)`.
- `loading` is `query.isPending`. It is true until the first load has finished, and must not turn back on during later refetches.
- `error` is the error message **only when there is no data yet** (`query.isError && !query.data`), otherwise `null`. A failed background refetch must not replace a working screen with the error screen.
- `refresh` is `async () => { await query.refetch() }`. It returns `Promise<void>`, so the `await refresh()` calls in the setup steps still wait for fresh data.
- `profile`, `household` and `partner` come from `query.data`, or are `null` when there is no data.

### Change these files
- **`src/main.tsx`:** wrap the app in `<QueryClientProvider client={queryClient}>`, outside `<AuthProvider>` and inside `<HashRouter>`.
- **`src/auth/AuthProvider.tsx`:** in the `onAuthStateChange` callback, when the event is `'SIGNED_OUT'`, call `queryClient.clear()`, so one user's data never stays in memory for the next. Don't change anything else in this file.
- **`src/App.tsx`:**
  - Remove the `<ProfileProvider>` wrapper, so the signed-in branch renders `<SignedInApp />` directly.
  - Import `useProfile` from `./household/useProfile`.
  - Keep `SignedInApp`'s logic exactly as it is.
- **`ProfileStep.tsx`, `HouseholdStep.tsx`, `src/pages/Us.tsx`:** change only the `useProfile` import path to the new file. Nothing else.
- **Delete `src/household/ProfileProvider.tsx`.** The visibility listener goes with it, because `refetchOnWindowFocus` now does that job.

### Rules
- TypeScript only. Don't use `any`. Type the query data as `{ profile: Profile; household: Household | null; partner: Profile | null }`.
- Write **one file per write**. Change existing files with small `edit`s, never by rewriting them.
- Do **not** change any file not listed above. Do **not** run any git commands.

### Done when
1. `npm run build` passes with no TypeScript errors.
2. `npm run test:db` still prints `31 passed, 0 failed`.
3. Searching `src` for `ProfileProvider` finds nothing.
4. You have re-read this brief and confirmed each point.

Reply with: the files created, changed and deleted, the build result, and anything you were unsure about.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access (enabled by the user), web UI.
- **Wall time:** **4 min 3 s**, the fastest run so far.
- **Outcome:** finished with a checklist mapping every brief point to its change, and named one honest doubt (the data type, see below).
- **Saved:** harness output committed unchanged as `450b2a4`.

## Result
**This is the closest any run has come to the brief.**
- Every file was created, changed or deleted as listed.
- `ProfileProvider` is gone from `src`.
- The query key, `enabled`, `loading = isPending`, the "error only when there's no data" rule, `refresh` and `queryClient.clear()` on `SIGNED_OUT` are all as specified.
- The build passes, and the database tests are still 31/31.

Two small issues:
1. **`error` used `String(query.error)`,** which adds an `Error: ` prefix to every message shown on the error screen.
2. **It typed the query result with `profile: Profile | null`** and used `as ProfileResult` casts, instead of the brief's `profile: Profile`. It flagged this itself, reasoning that the result is null before data arrives. That's true of the *hook's return*, not of the *query data*, which is never partial.

## What I changed
- `useProfile.ts`:
  - The result type is now `profile: Profile`, and the two `as` casts are gone.
  - The hook reads `query.data?.… ?? null` for each field.
  - `error` uses `query.error.message`.

### Checked in the browser
Same mock Supabase and fake session as in task 07:
- **Step 1 loads prefilled** through the new hook.
- **Joining with `abcd1234`** lands in the app. The Us page shows "Bob's household" and both members.
- **With the mock stopped,** a reload shows `TypeError: Failed to fetch` and **Retry**. The `TypeError:` is part of supabase-js's own message; there's no extra `Error:` any more.
- **Restarting the mock and pressing Retry** loads normally.
- **Sign out** goes to the sign-in screen, and local storage is empty afterwards.

Afterwards: the mock was stopped, the service worker cleared, and the app rebuilt without test values. The build passes, the database tests are 31/31, and no test values are in `dist`.

**Noticed, not changed:**
- With the backend unreachable, "Loading…" showed for about **25 seconds** before the error. That's supabase-js's network failure time plus one retry.
- If you create a household, switch apps to share the code, then come back, the refetch on focus sees the new household and **skips the code screen**. The old hand-written loader did the same thing. No harm is done, because the Us page shows the code.

Both belong to the planned offline and PWA work, not this refactor.

## How I would have done it
The same. This is the textbook shape for TanStack Query: a hook with `useQuery` keyed by user, a `QueryClientProvider` at the root, and `clear()` on sign-out. The only additions I'd make:
- **A shared `queryKeys` helper** (e.g. `queryKeys.household(userId)`), so later mutations can invalidate by key without retyping arrays.
- **Moving the setup writes to `useMutation`** with `onSuccess: invalidate`. That's worth doing when meal logging adds the first real mutations.

## Verdict
**Usable after a two-line fix.** Lessons:
1. **When the brief states the state rules explicitly, the 35B gets them right.** "`loading` must not turn back on", "`error` only when there's no data" and "`refresh` returns `Promise<void>`" were written as rules this time, and all three came out correct. Those were exactly the areas tasks 06 and 07 got wrong.
2. **Small, precise refactors are the 35B's sweet spot:** 4 minutes, with an accurate self-report.
