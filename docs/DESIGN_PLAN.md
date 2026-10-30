# Calbud redesign plan: "Fresh Coral & Green Circle"

**Target:** [`dev/calbud-mockups-v2.html`](../dev/calbud-mockups-v2.html), the approved look for everything from here on.
**Where it starts:** the app is dark slate (`bg-slate-900`/`slate-800`, white text, blue buttons), Tailwind v4, 4,000 lines in ~40 `.tsx` files with ~600 `className`s. The mockup is a warm cream page, white cards, coral accents, and a green progress ring.
**How it runs:** the normal Calbud loop in [`review/WORKFLOW.md`](review/WORKFLOW.md): one brief per task (numbered 50 onward), the local harness builds, Claude reviews and fixes, one review note per task.

## Ground rules for every task
1. **Branch `redesign`, not `main`.** The page background flips to light in task 50, so screens not yet converted will be unreadable (white text on cream) until their task lands. A push to `main` deploys, so nothing merges until task 65 passes. Claude does the merge.
2. **Look only, behaviour untouched.** No change to logic, hooks, queries, routes, or visible text. `npm test` must pass with the same test count as before the task, and `npm run build` must pass. (The one exception is the new pure helpers in 51 and 52, which come with their own tests.)
3. **Use the tokens, never raw colors.** After task 50, new classes are `bg-cream`, `bg-card`, `text-ink`, `text-muted`, `bg-coral-light`, `bg-coral-deep`, `text-link`, `text-danger`, `text-warn`, `text-section`, `border-line`, `text-ring`, and so on. **Every token is a CSS variable with a light and a dark value** (see "Dark mode"), so a converted file works in both themes with no `dark:` variants. No new `slate-`, `gray-`, `blue-`, `red-`, `amber-` or hex classes in converted files.
4. **Mechanical mapping for reskin tasks** (the 35B should do these edits one component at a time):

   | Old (dark) | New |
   |---|---|
   | `bg-slate-900` page / inset rows | `bg-cream` / `bg-coral-light/50` |
   | `bg-slate-800` card | `bg-card rounded-3xl shadow-card` |
   | `hover:bg-slate-700`, `border-slate-600/700` | `hover:bg-coral-light`, `border-line` |
   | `text-white` | `text-ink` |
   | `text-gray-300/400/500` | `text-muted` |
   | `bg-blue-600 hover:bg-blue-700 text-white` (primary button) | `bg-coral-deep hover:bg-coral-deeper text-white rounded-2xl font-bold` |
   | `text-blue-400` link | `text-link underline` |
   | `text-red-400` | `text-danger` |
   | `text-amber-500` | `text-warn` |
   | inputs (`bg-slate-700` etc.) | `bg-white border border-line rounded-2xl text-ink placeholder:text-muted` |
5. **Files per task:** at most three components. For files over ~150 lines (only `PrepForm.tsx`), the brief uses skeleton-plus-steps and one edit per group.
6. **Acceptance for every reskin task**, in addition to build and tests: `grep -nE "slate-|gray-|blue-|text-white" <task's files>` returns nothing, except where a file legitimately needs white text on a coloured fill (buttons, the scan FAB).

## Visual spec (from the mockup, to put in the briefs)
- **Colors:** page `#fffaf5` (cream), text `#3d2c2c` (ink), muted `#7a6b6b`, coral light `#ffedd5`, coral mid `#fed7aa`, coral accent `#fb923c`, green ring `#10b981`, ring track `#fde8d0`, card white, line `#f0e4d8`.
- **Shape:** cards `rounded-3xl` with a soft shadow `0 2px 8px rgba(0,0,0,.03)`; icon tiles `rounded-2xl`; pills fully rounded; section titles 13px bold uppercase, tracking 1.5px, color `#d97706`.
- **Contrast fix (a deliberate departure from the mockup):** white text on `#fb923c` is about 2.3:1, too low for a filled button. Filled buttons use `coral-deep` `#c2410c` (white text about 5:1). The `#fb923c` coral stays for the scan FAB gradient (an icon), the active-day tint and decoration.
- **Layout:** a 375 px design.

## Dark mode
Light is the mockup. Dark is a warm dark version of it (not the old cold slate), so the two feel like one design. **The user picks System / Light / Dark**; the default is System (follows the phone).

| Token | Light | Dark |
|---|---|---|
| `cream` (page) | `#fffaf5` | `#1b1512` |
| `card` | `#ffffff` | `#271f1b` |
| `ink` | `#3d2c2c` | `#f6ece4` |
| `muted` | `#7a6b6b` | `#b9a99d` |
| `line` | `#f0e4d8` | `#3b2f29` |
| `coral-light` (pills, active tint) | `#ffedd5` | `#3d2615` |
| `coral-deep` (filled buttons, white text) | `#c2410c` | `#c2410c` (same; white on it is about 5:1 on both) |
| `link` | `#c2410c` | `#fdba74` |
| `section` (caps titles) | `#d97706` | `#fbbf24` |
| `danger` | `#dc2626` | `#f87171` |
| `warn` | `#d97706` | `#fbbf24` |
| ring: `ring` / `ring-track` | `#10b981` / `#fde8d0` | `#34d399` / `#3d2a1c` |
| macro tints (rose, amber, green): bg / text | `#fff1f2` `#be123c`, `#fefce8` `#854d0e`, `#f0fdf4` `#166534` | `#3a1d24` `#fda4af`, `#352b12` `#fde047`, `#14301f` `#86efac` |

Mechanics: tokens are CSS variables set on `:root` and overridden on `:root.dark`; Tailwind's `@theme inline` maps each to a color name. The `dark` class on `<html>` is set from the saved choice (`localStorage` key `calbud-theme`, values `system|light|dark`) or, for `system`, from `prefers-color-scheme`, by a tiny inline script in `index.html` **before the app loads** so there is no white flash. The Nutrition Facts label stays black-on-white in both themes. On wider screens the app is a centered `max-w-md` column with the cream page beside it.

## Tasks

| # | Task | Files | Model | Notes |
|---|---|---|---|---|
| **50** | **Tokens and shell.** `@theme inline` tokens in `index.css` (every color in the light/dark table above as a CSS variable on `:root` with a `:root.dark` override, plus `shadow-card` and the `font` stack), body uses `bg-cream text-ink`, `max-w-md` centered column. `App.tsx`: header becomes "Calbud" (left, 26px/800) with room for a right-hand slot; bottom nav is the white rounded-top bar from the mockup, active tab coral and bold, with a `coral-light` circle raised behind the **active** tab; loading, error and Supabase-not-configured screens restyled. Also `OfflineBanner.tsx` and `UpdatePrompt.tsx`. | `index.css`, `App.tsx`, `pwa/OfflineBanner.tsx`, `pwa/UpdatePrompt.tsx` | 35B High | Do first. Every later task depends on the token names. |
| **50a** | **Theme switch.** Pure `src/ui/theme.ts`: `parseTheme(raw)` (anything but `light`/`dark` gives `system`), `resolveTheme(pref, systemDark)` returns `light` or `dark`, with `theme.test.ts`. `applyTheme(pref)` sets or clears the `dark` class on `<html>` and saves `calbud-theme` (all `localStorage` calls in try/catch). `useTheme.ts` hook that also re-applies when the system setting changes while on System. `ThemeToggle.tsx`: a three-way segmented control (System / Light / Dark). Inline pre-paint script in `index.html` that does the same read and sets the class. The toggle is placed on the Us page in task 62. | `ui/theme.ts(+test)`, `ui/useTheme.ts`, `ui/ThemeToggle.tsx`, `index.html` | 35B (4B for the pure helper if unblocked) | After 50. The dark values in the table above must already be in `index.css` from task 50. |
| **51** | **Kcal ring.** Pure `src/today/ringMath.ts`: `ringDash(consumed, goal, circumference)` returns the stroke-dashoffset, clamped 0–1 of the way round; `goal <= 0` gives an empty ring; over goal gives a full ring plus `over: true`. With `ringMath.test.ts` (edge cases: 0, goal reached, over, goal 0, negative). Then `KcalRing.tsx`: the 160 px SVG from the mockup (cream track, green arc, round cap, starts at 12 o'clock), the big number in the centre ("cal left", or "cal over" in amber with an amber arc). | `today/ringMath.ts(+test)`, `today/KcalRing.tsx` | 35B (4B for the pure helper if its sandbox is unblocked) | The mockup's ring SVG has a hard-coded arc path; the real one needs `transform="rotate(-90 80 80)"` on a full circle with dasharray, so the arc is correct for any value. |
| **52** | **Day strip.** Pure `today/dayStrip.ts`: `stripDays(selected, today)` returns 5 days centred on `selected` as `{date, dow, dom, isSelected, isFuture}`. Test it (month boundaries, selected = today, future days flagged). `DayStrip.tsx`: the mockup's strip, selected day on `coral-light` with coral-deep text, future days disabled and faded, tapping calls `onPick(date)`. | `today/dayStrip.ts(+test)`, `today/DayStrip.tsx` | 35B (4B for the helper) | Uses `addDays` from `prep/week.ts`. Replaces the ‹ › arrows. |
| **53** | **Meal sections.** `MealSection.tsx` restyled: white card, meal icon tile (🍳 breakfast, 🥗 lunch, 🍽️ dinner, 🍎 snack), name and quantity, a kcal pill on `coral-light`. The section title above the card in the 13px caps style. Empty meal shows the dashed "+ Add food" row that links to `/add` (or `/add?date=` for a past day). | `today/MealSection.tsx` | 35B | `groupByMeal` already returns all four meals, so Today needs no logic change: task 55 passes `emptyAddHref` and hides an empty snack section. Here only add the optional `emptyAddHref` prop and the row. |
| **54** | **Macro pills.** New `today/MacroPills.tsx`: three tiles (Protein, Carbs, Fat) as in the mockup, each showing `value g` and, smaller, "of `goal` g" when a goal is set. Tints rose / amber / green as in the mockup. `MacroBar.tsx` stays unused until 65, when it is deleted. | `today/MacroPills.tsx` | 35B | Keeps the goal display that the bars had. |
| **55** | **Assemble Today.** `pages/Today.tsx`: top of page is the date pill (`dayTitle`) beside a Back-to-today link when needed, then `KcalRing`, `DayStrip`, then the meal sections (always showing breakfast, lunch and dinner, plus snack only if logged, each empty one with the dashed row), then `MacroPills`, then More nutrients. The blue "Add food" button becomes a **floating action button** at bottom-right above the nav, linking to `/add` as before. Copy yesterday, the load error card, the menu, and the serving picker flow stay exactly as they are, only restyled. | `pages/Today.tsx` | 35B High, 27B as backup | This is the one task that touches logic-adjacent JSX in a 147-line file. The brief must say: change JSX and classNames only, keep every hook and handler. Claude reviews this one against the mock Supabase. |
| **56** | Today extras: `EditMealLog.tsx`, `MoreNutrients.tsx`, `TodayMenu.tsx`. | 3 files | 35B | Pure reskin. |
| **57** | **Add food screens.** `AddFood.tsx`, `FoodFinder.tsx`, `ServingPicker.tsx`. | 3 files | 35B | Inputs, search results, the serving picker's buttons. |
| **58** | Add food, the rest: `CustomFoodForm.tsx`, `ExtrasFields.tsx`, `RecipeBuilder.tsx`; and `BarcodeScanner.tsx`. `NutritionLabel.tsx` stays black-on-white (it mimics the real label). | 4 files | 35B | The nutrition label is the one place that stays as it is. |
| **59** | **Prep:** `pages/Prep.tsx`, `prep/GroceryList.tsx`, `prep/RepeatButton.tsx`. | 3 files | 35B | |
| **60** | **Prep form:** `prep/PrepForm.tsx` (367 lines). | 1 file | 35B in skeleton mode, **27B as backup** | The only file over 150 lines. The brief lists the form groups (name, when, ingredients, nutrients, buttons) as separate steps, one edit each, each ending with a build check. |
| **61** | **Menu and Plan:** `menu/MenuGrid.tsx`, `menu/SlotEditor.tsx`, `pages/Plan.tsx`. | 3 files | 35B | |
| **62** | **Plan extras and Us:** `activities/ActivityForm.tsx`, `activities/ExportButton.tsx`, `pages/Us.tsx`. Also add an **Appearance** card to Us holding the `ThemeToggle` from 50a. | 3 files | 35B | |
| **63** | **Us cards:** `household/YouCard.tsx`, `GoalsCard.tsx`, `DataCard.tsx`, `dashboard/WeekCard.tsx`, `household/SwitchHousehold.tsx`, `CopyCode.tsx`. | 6 small files | 35B, two runs of 3 if it stalls | |
| **64** | **Sign-in and setup:** `auth/AuthScreen.tsx`, `auth/ResetPassword.tsx`, `household/Setup.tsx`, `HouseholdStep.tsx`, `ProfileStep.tsx`. | 5 files | 35B, split in two if needed | |
| **65** | **Sweep (Claude).** Grep the whole `src/` for `slate-|gray-|blue-|text-white` and fix what is left; delete `MacroBar.tsx` if unused; PWA `theme_color` and `background_color` in `vite.config.ts` to cream/coral, and a second `<meta name="theme-color">` with `media="(prefers-color-scheme: dark)"` for dark; recolor the install icons if they are dark; check contrast in **both** themes; walk every screen at 375 px and at desktop width **in light and in dark** on the mock Supabase, with screenshots; build, tests. Then merge `redesign` to `main` and push. | many | Claude | The only task Claude does itself, because it is cross-cutting and needs the browser. |

(Only the plan is written so far. Each brief is written just before its run, so it can use the real files the previous task left.)

## Order and what can run in parallel
- **Strictly in order:** 50 first (tokens), then 51–55 (Today) because 55 assembles 51–54.
- **After 50, these are independent** and could run at the same time if a second GPU job fits: 56–64 each touch their own files. Task 65 comes last. The 35B and the 27B can't share the GPUs, so in practice the 35B runs them one after another.
- **Side jobs for the 4B on the 3050** (only the pure helpers: `ringMath` and `dayStrip` with tests), and only if its headless sandbox allows vitest. Otherwise they stay with the 35B.

## Review checks (Claude, after each run)
- `git diff` shows only `className`/JSX changes in that task's files, and no changed strings.
- `npm run build` and `npm test`: same number of tests as before.
- The grep from rule 6.
- For 55 and 65, screenshots on the mock Supabase (`mock-supabase.mjs` pattern with a fake `sb-127-auth-token`), at 375 px.

## Open questions (default if not answered)
1. **Bottom nav tabs.** The mockup says Menu / Today / Prep / Plan, but the app's tabs are Today / Prep / Plan / Us, and Menu lives inside Prep. *Default: keep the four real tabs and the mockup's styling, no Menu tab.*
2. **The scan button.** The mockup's FAB has a grid icon (called "scan"). *Default: the FAB is "Add food", linking to `/add`, where barcode scanning already lives. It replaces the blue Add food button.*
3. **Dark mode.** Decided: yes, a user choice of System / Light / Dark, default System, using the warm dark palette above. The old cold slate theme is removed. *Default if not answered: the palette in the table.*
