# 34: Export the week's activities to a calendar (.ics)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app. The Plan tab (`src/pages/Plan.tsx`) lists the week's activities (gym sessions and so on) for the two people. Add an **Export week** button: it turns the activities on screen into a `.ics` calendar file and hands it over, so they can be imported into Google Calendar or Apple Calendar. The file builder already exists; this task is the glue and the button.

### Already done (don't redo)
- **The builder:** `src/calendar/ics.ts` exports `buildIcs(events: CalEvent[], options: { timeZone: string; now: Date; calendarName?: string }): string` and the `CalEvent` type (`{ uid, title, date, startTime: 'HH:MM[:SS]' | null, durationMin: number | null, notes?: string | null }`). A null `startTime` makes an all-day event, and a null `durationMin` on a timed event means 60 minutes. Do not change that file.
- **The activities:** `Activity` in `src/activities/types.ts`; `visibleActivities` and `sortDay` in `src/activities/activities.ts`.
- **The page:** `src/pages/Plan.tsx` already has the week on screen (`start`), the Me / Both toggle (`visibility`), the loaded `data`, and `profile` from `useProfile()` (`profile.profile` is me, `profile.partner` is the partner or null; each has `id`, `display_name`, and my profile has `timezone`).

### Read only these files
- This file.
- `src/calendar/ics.ts` (only the exports at the top and `buildIcs`), `src/activities/types.ts`, `src/activities/activities.ts`, `src/pages/Plan.tsx`.
- The first 20 lines of `src/activities/activities.test.ts`, for the test style.

### Write in this order. Run `npm test` after step 2 before you continue.

### 1. `src/calendar/exportWeek.ts` (new)
```ts
import type { Activity } from '../activities/types'
import type { CalEvent } from './ics'

// One calendar event per activity, ordered by date, then start time (earliest first), with untimed ones after the timed ones on the same day, otherwise in the given order. The input array is not changed.
//  uid: 'activity-' + id.  title: the activity title, or `${name}: ${title}` when prefixNames is true and names has an entry for that user_id.
//  date, startTime, durationMin, notes copied unchanged.
export function activityEvents(items: Activity[], names: Record<string, string>, prefixNames: boolean): CalEvent[]

// 'calbud-2026-10-25.ics' for the week starting 2026-10-25.
export function exportFileName(weekStart: string): string

// True for an installed iPhone or iPad web app: where downloads are unreliable and sharing the file works better.
//  userAgent contains 'iPhone' or 'iPad', OR it contains 'Macintosh' while maxTouchPoints > 1 (iPadOS says Macintosh). And `standalone` is true.
export function isIosStandalone(userAgent: string, maxTouchPoints: number, standalone: boolean): boolean

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled'

// The parts of `navigator` this needs, so tests can pass a fake.
export interface ShareNav {
  canShare?: (data: { files: File[] }) => boolean
  share?: (data: { files: File[]; title: string }) => Promise<void>
}

// preferShare false: call download(file), return 'downloaded'.
// preferShare true and nav.share exists and nav.canShare exists and nav.canShare({ files: [file] }) is true:
//   await nav.share({ files: [file], title: 'Calbud week' }) and return 'shared'.
//   If it throws an error whose name is 'AbortError' (the person closed the sheet): return 'cancelled', and do NOT download.
//   Any other error: fall back to download(file) and return 'downloaded'.
// preferShare true but sharing is not possible: download(file), return 'downloaded'.
export async function deliverIcs(file: File, preferShare: boolean, nav: ShareNav, download: (file: File) => void): Promise<DeliverResult>
```

### 2. `src/calendar/exportWeek.test.ts` (new): one `it` each
Helper `act(overrides)` in the test file: default `id: 'a1'`, `user_id: 'me'`, `title: 'Gym'`, `scheduled_date: '2026-10-27'`, `start_time: null`, `duration_min: null`, `kcal_burned: null`, `completed: false`, `notes: null`, `created_at: ''`. For the `File` argument, use `new File(['x'], 'a.ics', { type: 'text/calendar' })`; if `File` is not defined in this test environment, use `{} as File` instead.
1. `activityEvents([act({ start_time: '18:00:00', duration_min: 90, notes: 'legs' })], {}, false)` equals `[{ uid: 'activity-a1', title: 'Gym', date: '2026-10-27', startTime: '18:00:00', durationMin: 90, notes: 'legs' }]`.
2. An untimed activity gives `startTime: null` and `durationMin: null`, and `notes: null` stays `null`.
3. With names `{ me: 'Alice', bob: 'Bob' }` and `prefixNames` true: a row of `user_id: 'me'` gets the title `Alice: Gym`; with `prefixNames` false it stays `Gym`.
4. `prefixNames` true but the `user_id` is not in `names`: the title stays `Gym`.
5. Order: given (in this order) an untimed activity on `2026-10-28` (id `n`), a `19:00:00` one on `2026-10-27` (id `b`), an `07:30:00` one on `2026-10-27` (id `a`), and an untimed one on `2026-10-27` (id `c`), the uids come out `activity-a`, `activity-b`, `activity-c`, `activity-n`. The input array is not changed.
6. `activityEvents([], {}, false)` equals `[]`.
7. `exportFileName('2026-10-25')` equals `'calbud-2026-10-25.ics'`.
8. `isIosStandalone`: an iPhone user agent (`'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'`) with `maxTouchPoints` 5 and `standalone` true gives true; the same with `standalone` false gives false.
9. `isIosStandalone`: an iPad that says Macintosh (`'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'`, `maxTouchPoints` 5, `standalone` true) gives true; a real Mac (same agent, `maxTouchPoints` 0, `standalone` true) gives false; an Android phone agent (`'Mozilla/5.0 (Linux; Android 14)'`, 5, true) gives false.
10. `deliverIcs(file, false, nav, download)` with a `nav` that has working `canShare` and `share`: `download` is called once with the file, `share` is not called, and the result is `'downloaded'`.
11. `deliverIcs(file, true, { canShare: () => true, share }, download)`: `share` is called once with `{ files: [file], title: 'Calbud week' }`, `download` is not called, and the result is `'shared'`.
12. When `share` rejects with an error whose `name` is `'AbortError'`: the result is `'cancelled'` and `download` is not called.
13. When `share` rejects with `new Error('boom')`: `download` is called once and the result is `'downloaded'`.
14. `preferShare` true but `nav` is `{}`, and again with `canShare` returning false: `download` is called and the result is `'downloaded'`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 3. The button: `src/activities/ExportButton.tsx` (new)
```tsx
export default function ExportButton({ items, start, prefixNames }: { items: Activity[]; start: string; prefixNames: boolean })
```
`items` is the list currently shown (already filtered by Me / Both).
- **Data:** `const { profile, partner } = useProfile()` (copy the import from `src/pages/Plan.tsx`). `names` is `{ [profile.id]: profile.display_name, [partner.id]: partner.display_name }` (leave the partner out when there is none). Render `null` while `profile` is missing. Call all hooks before any early return.
- **State:** `message: string | null`, `failed: boolean`.
- **The button:** `type="button"`, `text-sm text-blue-400 underline`, text `Export week`, inside a `px-3 py-3 text-center` wrapper. Disabled when `items` is empty. Under it, always, `text-xs text-gray-500 mt-1`: `Import the file into a Calbud calendar. In Google Calendar: Settings, then Import & export, then Import.`
- **Clicking:**
  1. `events = activityEvents(items, names, prefixNames)`
  2. `text = buildIcs(events, { timeZone: profile.timezone, now: new Date(), calendarName: 'Calbud' })`
  3. `file = new File([text], exportFileName(start), { type: 'text/calendar' })`
  4. `preferShare = isIosStandalone(navigator.userAgent, navigator.maxTouchPoints, standalone)`, where `standalone` is `window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true`
  5. `await deliverIcs(file, preferShare, navigator as unknown as ShareNav, downloadFile)`
  6. result `'cancelled'`: no message. Otherwise set the message to `Exported N activities.` (`1 activity` for one).
  7. Wrap steps 1 to 6 in `try/catch`: **a thrown error must show its `message` in `text-red-400 text-xs mt-1` and leave the button usable.** (`buildIcs` throws `Invalid time zone…` for a bad zone.) A success message uses `text-green-400 text-xs mt-1`. Clear the message at the start of each click.
- **`downloadFile(file: File)`:** a small function in this component file: `URL.createObjectURL(file)`, a temporary `<a>` with `href` and `download = file.name`, appended to `document.body`, clicked, removed, and `URL.revokeObjectURL` after `setTimeout(…, 1000)`.
- Use `key={start}` where you render it, so the message resets when the week changes.

### 4. `src/pages/Plan.tsx`
- Render `<ExportButton items={visible} start={start} prefixNames={showToggle && visibility === 'both'} key={start} />` right after the list of days, inside the same fragment, only when the week has loaded (inside the existing `data && !isLoading && !error` block).
- Change nothing else on the page.

### Rules
- **Files:**
  - create only `src/calendar/exportWeek.ts`, `src/calendar/exportWeek.test.ts` and `src/activities/ExportButton.tsx`
  - change only `src/pages/Plan.tsx`
  - **never edit any file under `docs/`**, and do not change `src/calendar/ics.ts`
- **Don't:**
  - run git commands, create `.env` files, or add packages
  - create any other files, including files for build output: read the build's output in the terminal
- **Writing:** write each new file in one write, then fix with small `edit`s. Keep JSX ternaries shallow. In JSX text, write `&` as a plain character if the linter allows it, otherwise as `&amp;`. Never put an early `return` before a hook. **Import and use the existing helpers; do not write a second copy of anything that already exists.**
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 14. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste its last 5 lines.**
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.6:35b-a3b-128k` at **High**, Full access, web UI. One brief.
- **Wall time:** about **8 min**, 32 steps. The docs ban held.
- **Outcome:** finished, and it reported "nothing unsure". It added `ExportButton` and the page line as briefed.

## Result
- **Builds:** yes. **Tests:** 298 passing (279 + 19: the 14 asked for, and its tests split a few cases).
- **Click-through** at 375 px against the mock, capturing the file the button builds:
  - **Both:** three events with name prefixes ("Bob: Run", "alice: Gym: legs", "alice: Yoga"). The 18:00 gym on 26 Oct is `22:00Z` (New York in daylight time), the 07:00 run is `11:00Z`, and the untimed yoga is an all-day event.
  - **Me:** two events, no prefixes. File name `calbud-2026-10-25.ics`, message "Exported 3 activities." in green.
- **Not tested:** a real import into Google or Apple Calendar, and the iPhone share sheet. Both need your phone or calendar.

## What I changed
- **`ExportButton`:** a `useCallback` came after `if (!profile) return null`, which changes the hook count when the profile loads (the same crash as in task 30). I made the handler a plain function.
- **Message colour:** it was chosen by searching the text for "Exported". It now uses a `failed` flag, as briefed.
- **Imports:** merged the two imports from `exportWeek`.

## Verdict
Usable after small fixes. The hook-after-return mistake came back, so the brief rule "never put an early return before a hook" is not enough: the 35B also wraps things in `useCallback` after the guard. Next time say "no `useCallback` or `useMemo`; plain functions".
