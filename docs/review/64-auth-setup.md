# 64: Sign-in and setup (redesign)

Read `docs/review/redesign-common.md` first and follow it. Pure reskin of the screens a signed-out or new user sees.

## Files
`src/auth/AuthScreen.tsx` (102 lines), `src/auth/ResetPassword.tsx` (79 lines), `src/household/Setup.tsx` (27 lines), `src/household/HouseholdStep.tsx` (100 lines), `src/household/ProfileStep.tsx` (93 lines)

## Steps (one file at a time, one JSX block per edit)
1. These screens have no app shell around them, so each one's outer wrapper gets `min-h-screen bg-cream text-ink` and a centred `mx-auto max-w-md px-6 py-10`. The title `Calbud` (or the screen's own title) is `text-[26px] font-extrabold tracking-tight text-ink`.
2. The form area is a card (`bg-card rounded-3xl shadow-card p-6 space-y-4`). Fields in the input style, the main action the primary button (full width), secondary actions (switch between sign in and sign up, back links) `text-link font-semibold`, errors `text-danger text-sm`, hints `text-muted text-sm`.
3. **`HouseholdStep.tsx`:** the Create / Join choice, if it is two options, uses the segmented control look (track `bg-coral-light rounded-2xl p-1`, selected `bg-card text-ink shadow-card rounded-xl font-bold`).
4. **`ProfileStep.tsx`:** colour swatches keep their own colours (inline `style` is allowed), selected swatch `ring-2 ring-offset-2 ring-coral`.

## Done means
- The "Done means" section for reskin tasks in `redesign-common.md`, for these five files.
- The reply format in `redesign-common.md`.
