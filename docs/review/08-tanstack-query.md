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
