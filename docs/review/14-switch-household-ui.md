# 14: "Join your partner's household" on the Us page

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. Two partners share a **household**. Your job is one small UI piece: on the Us page, let someone who is **alone** in their household join their partner's household with an invite code.

The database side is already done. `supabase.rpc('join_household', { p_code })` now lets a solo member switch. It moves their foods and meal prep to the new household and deletes their old one. It refuses with these messages (the client gets them as `error.message`):
- `join_household: no household has that invite code`
- `join_household: you are already in that household`
- `join_household: you are already in a household with someone`
- `join_household: that household already has 2 members`

### Read only these files
- This file.
- `src/pages/Us.tsx`: the page you change.
- `src/household/HouseholdStep.tsx`: the first-run join form. Copy its style (the class constants, `handleJoin`, the code input's attributes). **Don't change this file.**
- `src/household/useProfile.ts`: `useProfile()` gives `household`, `partner` and `refresh()`.
- `src/lib/errors.ts`: `friendlyError()`.
- `src/lib/queryClient.ts`: the shared `queryClient`.

### Create this file: `src/household/SwitchHousehold.tsx`
A default-exported component, `SwitchHousehold`, with no props. It has two states:

1. **Closed (the start):** one button, `Join your partner's household instead`. Use the `choiceClass` style from `HouseholdStep.tsx`. Clicking it opens the form.
2. **Open:** a `<form>` with:
   - A short note in `text-sm text-gray-400`: `Use this if your partner already made a household. Your food log, saved foods and meal prep move with you, and this household is deleted.`
   - A labelled code input (`Partner's invite code`), with the same attributes as the code input in `HouseholdStep.tsx` (`autoComplete="off"`, `autoCapitalize="none"`, `spellCheck={false}`, `maxLength={20}`).
   - A submit button `Join` (it shows `Joining…` while running) in `primaryClass`, disabled while running.
   - A `Cancel` button (`type="button"`, small grey text like `HouseholdStep`'s Back). It closes the form and clears the code and error. It is disabled while running.
   - The error, if any, in `text-red-400 text-sm`.

**Submitting:**
- Empty code (after `trim()`): show `Enter the code your partner shared.` and don't call anything.
- Otherwise call `supabase.rpc('join_household', { p_code: code.trim().toLowerCase() })`.
- **On error:** show `friendlyError(error.message)`, stop running, and leave the form open.
- **On success:** call `await queryClient.invalidateQueries()` (no arguments). Every cached query belongs to the old household, so all of them must refetch. `refresh()` alone isn't enough. Then the page re-renders with the partner, and this component disappears because `Us.tsx` only shows it when there's no partner.

### Change this file: `src/pages/Us.tsx`
Inside the existing `{!partner && ( … )}` block, after `<CopyCode … />`, add `<SwitchHousehold />` with a little space above it (for example, wrap it in `<div className="pt-4">`). Change nothing else on the page.

### Rules
- Don't change any other file. Don't run git commands. Don't create `.env` files. Don't add packages.
- Write each file in one write, then fix with small `edit`s.
- Run tests with `npm test` (not `node --test`).

### Done when
1. `npm run build` finishes with no errors. **Paste its last 5 lines in your reply.** Don't summarise them.
2. `npm test` still passes (63 tests).
3. You have re-read this brief and checked each point under "Create this file" against your code.

Reply with: the files created and changed, the pasted build lines, the last line `npm test` printed, and anything you were unsure about. Report only what you actually did and saw.
