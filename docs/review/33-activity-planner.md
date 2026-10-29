# 33: Activity planner (the Plan tab)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. The **Plan** tab (`src/pages/Plan.tsx`) is a placeholder. Build the activity planner there: the two people plan their gym sessions and other activities for the week, with a day, a time and a length. Later a button will export them to a calendar, so every activity needs a day and, when known, a start time.

### Already done (don't redo)
- **The table `activities` exists** with row-level security and Realtime. Columns: `id`, `user_id`, `title` (text, not null), `scheduled_date` ('YYYY-MM-DD', not null), `start_time` ('HH:MM:SS' or null), `duration_min` (int > 0, or null), `kcal_burned` (int >= 0, or null), `completed` (boolean, default false), `notes` (text or null), `created_at`. It has **no** `household_id`: every person in the household can read all of the household's rows, and you can only add, change or delete your own. Do not write a migration.
- **Week helpers:** `weekStart`, `weekDays`, `weekLabel`, `dayLabel`, `addDays` in `src/prep/week.ts`.
- **Today's date:** `useLocalDate()` in `src/lib/useLocalDate.ts`.
- **Who is who:** `useProfile()` in `src/household/useProfile.ts` returns `{ profile, partner, ... }`. A profile has `id`, `display_name` and `color` (a hex string). `partner` is null when there is none.
- **The look:** the Prep page (`src/pages/Prep.tsx`) and its form (`src/prep/PrepForm.tsx`) are the model for week navigation, day lists, the form, the two-step delete and the error and loading states.

### Read only these files
- This file.
- `src/pages/Prep.tsx`, `src/prep/PrepForm.tsx`, `src/prep/formValidation.ts`, `src/prep/prepApi.ts`, `src/prep/usePrepWeek.ts`, `src/prep/usePrepRealtime.ts`, `src/prep/week.ts`.
- The first 20 lines of `src/prep/formValidation.test.ts`, for the test style.

### Write in this order. Run `npm test` after step 2 before you continue.

### 1. `src/activities/types.ts` and `src/activities/activities.ts` (new)
```ts
// types.ts
export interface Activity {
  id: string; user_id: string; title: string
  scheduled_date: string; start_time: string | null; duration_min: number | null
  kcal_burned: number | null; completed: boolean; notes: string | null; created_at: string
}
export type ActivityFields = Pick<Activity, 'title' | 'scheduled_date' | 'start_time' | 'duration_min' | 'kcal_burned' | 'notes'>

// activities.ts
export interface ActivityFormInput { title: string; date: string; startTime: string; duration: string; kcal: string; notes: string }

export function parseActivityForm(input: ActivityFormInput):
  | { ok: true; fields: ActivityFields }
  | { ok: false; errors: Partial<Record<keyof ActivityFormInput, string>> }

export function activityFormFrom(a: Activity): ActivityFormInput

// One day's activities in order: those with a start time first, earliest first; then those without a time, in the order given.
export function sortDay(items: Activity[]): Activity[]

// 'mine' keeps only activities whose user_id is myId; 'both' keeps all.
export function visibleActivities(items: Activity[], mode: 'mine' | 'both', myId: string): Activity[]

// 'HH:MM' start (or nothing), then 'N min' or '1 h' or '1 h 30 min', then 'N cal burned', joined with ' · '. Skip a part that is missing.
export function activityDetails(a: Activity): string
```
`parseActivityForm` rules (copy the style of `parsePrepForm`):
- **title:** trimmed; empty gives `Give it a name.`; over 80 characters gives `Keep this under 80 characters.`
- **date:** must match `YYYY-MM-DD`, else `Pick a date.`
- **startTime:** empty means `null`; `HH:MM` becomes `HH:MM:00`; anything else gives `Use a time like 14:30.` Hours must be 00-23 and minutes 00-59, else the same message.
- **duration:** empty means `null` (not 60: an activity without a length is allowed); whole minutes 1 to 600, else `Enter minutes from 1 to 600.`
- **kcal:** empty means `null`; a whole number 0 to 5000, else `Enter calories from 0 to 5000.`
- **notes:** trimmed; empty means `null`.
- Return all errors at once. A failed result has no `fields`.

`activityFormFrom` gives strings for the form: `startTime` as `HH:MM` (or `''`), `duration` and `kcal` as numbers in strings (or `''`), `notes` as `''` when null.

`activityDetails` examples: start `18:00:00`, 90 min, 300 kcal gives `18:00 · 1 h 30 min · 300 cal burned`. No time, 45 min, no kcal gives `45 min`. Nothing at all gives `''`. 60 min gives `1 h`. 120 min gives `2 h`.

### 2. `src/activities/activities.test.ts` (new): one `it` each
Build data with a small helper `act(overrides)` in the test file (default `user_id: 'me'`, `title: 'Gym'`, `scheduled_date: '2026-03-02'`, `start_time: null`, `duration_min: null`, `kcal_burned: null`, `completed: false`, `notes: null`, `id: 'a1'`, `created_at: ''`).
1. `parseActivityForm` with title `' Gym '`, date `'2026-03-02'`, startTime `'18:00'`, duration `'90'`, kcal `'300'`, notes `' legs '` gives `ok: true` and fields `{ title: 'Gym', scheduled_date: '2026-03-02', start_time: '18:00:00', duration_min: 90, kcal_burned: 300, notes: 'legs' }`.
2. Everything optional empty gives `start_time: null`, `duration_min: null`, `kcal_burned: null`, `notes: null`.
3. An empty title gives `errors.title === 'Give it a name.'`; a title of 81 characters gives `'Keep this under 80 characters.'`.
4. A bad date `'2026-3-2'` gives `errors.date === 'Pick a date.'`.
5. Start times `'25:00'`, `'18:60'` and `'6pm'` each give `errors.startTime === 'Use a time like 14:30.'`.
6. Durations `'0'`, `'601'` and `'1.5'` each give `errors.duration === 'Enter minutes from 1 to 600.'`; `'600'` is fine.
7. kcal `'-1'`, `'5001'` and `'abc'` each give `errors.kcal === 'Enter calories from 0 to 5000.'`; `'0'` is fine and gives `kcal_burned: 0`.
8. A bad title and a bad date together give both errors in one result.
9. `activityFormFrom` of `act({ start_time: '18:00:00', duration_min: 90, kcal_burned: 300, notes: 'legs' })` gives `{ title: 'Gym', date: '2026-03-02', startTime: '18:00', duration: '90', kcal: '300', notes: 'legs' }`; of `act({})` gives `startTime: ''`, `duration: ''`, `kcal: ''`, `notes: ''`.
10. `sortDay`: given a no-time activity `n1`, a `19:00:00` one, an `07:30:00` one and another no-time `n2` (in that order), the result order is the 07:30 one, the 19:00 one, `n1`, `n2`. The input array is not changed.
11. `visibleActivities` with mode `'mine'` and myId `'me'` keeps only `user_id: 'me'`; with `'both'` keeps all.
12. `activityDetails`: the four examples above (full, `45 min` only, empty, and 60 and 120 minutes).

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 3. API and hooks (new files in `src/activities/`)
- **`activitiesApi.ts`:**
  - `fetchActivityWeek(start: string): Promise<Activity[]>` selects `*` where `scheduled_date` is between `start` and `addDays(start, 6)`, ordered by date, then `start_time` ascending with nulls last.
  - `insertActivity(userId: string, fields: ActivityFields): Promise<void>` inserts `{ ...fields, user_id: userId }`.
  - `updateActivity(id: string, changes: Partial<ActivityFields> & { completed?: boolean }): Promise<void>`.
  - `deleteActivity(id: string): Promise<void>`.
  - Copy the error handling of `prepApi.ts` exactly: `.select('id')` on every write, `throw new Error(error.message)`, and for update and delete throw `That activity could not be changed.` / `That activity could not be deleted.` when no row came back (that is what happens when you try to change your partner's row).
- **`useActivityWeek.ts`:** a `useQuery` with key `['activities', start]`, enabled only when the profile has a `household_id`, calling `fetchActivityWeek(start)`.
- **`useActivityRealtime.ts`:** like `usePrepRealtime`, one channel `activities-${householdId}` listening for INSERT, UPDATE and DELETE on `public.activities` with no filter (the table has no `household_id`; row-level security limits what arrives). Each event invalidates `['activities']`. Remove the channel in the cleanup.

### 4. The form: `src/activities/ActivityForm.tsx` (new)
```tsx
export default function ActivityForm({ activity, date, onClose }: { activity?: Activity; date: string; onClose: () => void })
```
Model it on `PrepForm` but it is much smaller: fields for name, date (`type="date"`), start time (`type="time"`), length in minutes, calories burned, notes (textarea). Use `parseActivityForm` and show each field's error under the field.
- **Save:** `useMutation`. New: `insertActivity(session.user.id, fields)` (get the user id from `useAuth()`, copy the import from `src/household/GoalsCard.tsx`). Existing: `updateActivity(activity.id, fields)`. On success invalidate `['activities']` and call `onClose`.
- **Delete** (only when editing): the same two-step confirm as `PrepForm`.
- **Both mutations:** a rejected promise must show its `message` in `text-red-400 text-sm` and leave the form usable (the buttons enabled again).
- **Hooks:** call every hook before any early return.

### 5. The page: `src/pages/Plan.tsx` (replace the placeholder)
- **Header:** the same week navigation as Prep: ‹ and › buttons, `weekLabel(start)`, and a `This week` link when not on the current week. Start from `weekStart(useLocalDate())`.
- **Toggle:** two buttons, `Me` and `Both`, `aria-pressed`, styled like the Menu / Plan / Grocery buttons on Prep. Default `Both`. If `partner` is null, show only the days without the toggle (everything is mine).
- **Days:** for each of `weekDays(start)`, a heading with `dayLabel(day)` (and `· Today` in `text-xs text-blue-400` on today), then that day's activities from `sortDay(visibleActivities(...))`. A `+ Add` button on each day heading opens the form for that date (`aria-label={`Add activity on ${dayLabel(day)}`}`). Show the empty message `Nothing planned this week. Tap + Add on a day.` when the visible list for the whole week is empty.
- **One activity row:**
  - A small dot (`w-2.5 h-2.5 rounded-full`) filled with the owner's `color` from `profile` or `partner`, with a `title` of their `display_name`. Show the dot only in `Both` mode.
  - The title and, under it in `text-xs text-gray-400`, `activityDetails(a)`. In `Both` mode on a partner's row, add the partner's `display_name` first in that line.
  - **My rows:** tapping the title opens the form to edit it, and a toggle button on the right reads `Planned` / `Done` and flips `completed` with `updateActivity` (copy `ToggleStatus` from Prep: error state `Try again`, disabled while pending, invalidate `['activities']`). A done row has its title struck through and dimmed (`line-through opacity-60`).
  - **My partner's rows:** not tappable and no toggle. On the right a plain text `Done` in `text-green-500 text-xs` when their `completed` is true, otherwise nothing.
- **States:** loading text, and an error with `Try again`, exactly like Prep's.
- **Form:** while the form is open, render `ActivityForm` instead of the page (like Prep does with `PrepForm`).
- **Realtime:** call `useActivityRealtime(profile.household_id)`.
- Do not touch `App.tsx`: the `/plan` route and tab already exist.

### Rules
- **Files:**
  - create only the files named above in `src/activities/` and replace `src/pages/Plan.tsx`
  - touch nothing else, and **never edit any file under `docs/`**
- **Don't:**
  - run git commands, create `.env` files, add packages, or write a migration
  - create any other files, including files for build output: read the build's output in the terminal
- **Writing:** write each new file in one write (or a skeleton first for the long ones), then fix with small `edit`s. Keep JSX ternaries shallow. In JSX text, write `…` and `·` as plain characters, never as entities or numbers. Never put an early `return` before a hook.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 12. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste its last 5 lines.**
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI. One brief.
- **Wall time:** about **15 min**, 32 steps. It wrote the logic and its 12 tests first, then the API, the form and the page.
- **Outcome:** finished. The docs ban held, and it ran tests and the build itself.

## Result
- **Builds:** yes. **Tests:** 279 passing (267 + 12).
- **Click-through** at 375 px against the mock (I added an `activities` table to the mock, with Alice's gym, Bob's run and an untimed yoga):
  - **Both / Me:** Both shows Bob's run with a green dot, "Bob · 07:00 · 45 min" and no buttons. Me hides his row and the dots.
  - **Tick:** Planned to Done saved `completed: true`, and the row struck through.
  - **Add:** Swim on Sat at 19:30 for 45 min saved and showed in the list.
  - **Edit and error:** the form opens filled in. Saving a row that had been deleted elsewhere showed "That activity could not be changed." and left Save usable.
  - **Delete:** the two-step confirm worked.
  - **Not tried:** live updates between two phones.

## What I changed
- **`Plan.tsx`:** it carried its own copy of `activityDetails`, so the tested one was unused. It now imports it, and uses `visibleActivities` too.
- **Partner rows:** "Done" now sits on the right, and the partner's name is in the details line, as the brief said.
- **Dots:** shown only in Both mode.

## Verdict
Usable after small fixes. Lesson: when a brief names a tested function, add "import it, don't write another copy in the page".
