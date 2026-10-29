# 32: The `.ics` calendar-file builder (pure logic, no screen)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript app. The app will later let people export their week to Google Calendar as an `.ics` file. This task is **only the builder**: one pure function that turns a list of events into the text of an `.ics` file, plus its tests. No screen, no button, no network, no new packages (do **not** install the `ics` npm package; write it by hand). Time zones are the hard part, so take your time and test them carefully.

### Read only these files
- This file.
- `src/prep/week.ts` (date helpers; you may reuse none of it, it is only for style).
- The first 20 lines of `src/prep/grocery.test.ts`, for the test style.

### Files
- Create `src/calendar/ics.ts` and `src/calendar/ics.test.ts`. Touch nothing else, and **never edit any file under `docs/`**.
- Run tests with `npx vitest run src/calendar/ics.test.ts`, then `npm test` at the end. Never `node --test`.
- Write each file in chunks of about 100 lines: a skeleton first, then one edit per group of tests.

### The API
```ts
export interface CalEvent {
  uid: string                  // stable id, e.g. 'prep-123'
  title: string
  date: string                 // 'YYYY-MM-DD', the local calendar day
  startTime: string | null     // local wall time 'HH:MM' or 'HH:MM:SS', or null for an all-day event
  durationMin: number | null   // used only when startTime is set; null means 60
  notes?: string | null
}

export interface IcsOptions {
  timeZone: string             // IANA name, e.g. 'America/New_York': the zone the local times are in
  now: Date                    // for DTSTAMP, passed in so tests are exact
  calendarName?: string
}

export function buildIcs(events: CalEvent[], options: IcsOptions): string
```
Also export `localToUtc(date: string, time: string, timeZone: string): Date` (the zone conversion), because it gets its own tests.

### Rules for `buildIcs`
1. **Line endings are `\r\n`**, including after the last line.
2. **The calendar wrapper**, in this order: `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//Calbud//Week export//EN`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`, then `X-WR-CALNAME:<name>` **only if** `calendarName` is given, then the events, then `END:VCALENDAR`. With no events it is still a valid calendar with no `VEVENT`.
3. **Each event**, in the given order: `BEGIN:VEVENT`, `UID:<uid>@calbud`, `DTSTAMP:<now in UTC>`, the start line, the end line, `SUMMARY:<title>`, `DESCRIPTION:<notes>` **only if** notes is a non-empty string after trimming, `END:VEVENT`.
4. **Timed event** (`startTime` set):
   - the start is converted from the local wall time in `timeZone` to UTC: `DTSTART:20260115T220000Z`
   - the end is the start plus `durationMin` minutes (60 when `durationMin` is null), also in UTC: `DTEND:…Z`
   - UTC format is `YYYYMMDDTHHMMSSZ`. Seconds are `00` when the time has no seconds.
5. **All-day event** (`startTime` is null): `DTSTART;VALUE=DATE:20260115` and `DTEND;VALUE=DATE:20260116` (the next day, which is how all-day events end). Month and year ends must roll over (`2026-01-31` → `20260201`, `2026-12-31` → `20270101`). Use `Date.UTC` arithmetic, never local-time `Date` arithmetic.
6. **Escaping** in `SUMMARY` and `DESCRIPTION` text: backslash becomes `\\`, then semicolon `\;`, comma `\,`, and a newline (`\r\n`, `\r` or `\n`) becomes the two characters `\n`. Do the backslash first.
7. **Line folding:** no physical line may be longer than **75 bytes** in UTF-8 (the line ending does not count). A longer line is split: the first physical line holds up to 75 bytes, and each continuation line starts with one space and holds up to 74 more bytes of content (so it is also at most 75 bytes). **Never split inside a multi-byte character.** Unfolding (removing every `\r\n ` pair) must give back the original line.
8. **`DTSTAMP`** is `options.now` as UTC, in the same format as rule 4.

### `localToUtc(date, time, timeZone)`
Returns the instant at which the wall clock in `timeZone` shows `date` + `time`. Use only `Intl.DateTimeFormat` (with `timeZone`, `hourCycle: 'h23'` and numeric parts); no libraries. A way that works: guess `utc = Date.UTC(parts)`, ask what the zone's wall clock shows for that instant to get the offset, subtract the offset, then check the result once more because the offset can differ across a daylight-saving change.
- **Spring forward** (a wall time that does not exist, e.g. 02:30 on 2026-03-08 in `America/New_York`): return the instant that is 02:30 using the offset from *before* the change, which is 07:30Z. That equals 03:30 EDT.
- **Fall back** (a wall time that happens twice, e.g. 01:30 on 2026-11-01 in `America/New_York`): return the **first** occurrence, the daylight one: 05:30Z.
- Invalid input (a date that does not match `YYYY-MM-DD`, a time that does not match `HH:MM` or `HH:MM:SS`, or an unknown time zone) throws an `Error` whose message starts with `Invalid`.

### Tests: one `it` each (write them first, in chunks)
`localToUtc`:
1. `('2026-01-15', '17:00', 'America/New_York')` → `2026-01-15T22:00:00.000Z` (EST, −5).
2. `('2026-07-15', '17:00', 'America/New_York')` → `2026-07-15T21:00:00.000Z` (EDT, −4).
3. `('2026-03-08', '09:00', 'America/New_York')` → `2026-03-08T13:00:00.000Z` (the day clocks go forward, after the change).
4. `('2026-11-01', '09:00', 'America/New_York')` → `2026-11-01T14:00:00.000Z` (the day clocks go back, after the change).
5. `('2026-03-08', '02:30', 'America/New_York')` → `2026-03-08T07:30:00.000Z` (the gap).
6. `('2026-11-01', '01:30', 'America/New_York')` → `2026-11-01T05:30:00.000Z` (the repeated hour, first one).
7. `('2026-01-15', '08:00', 'Asia/Kolkata')` → `2026-01-15T02:30:00.000Z` (+5:30).
8. `('2026-01-15', '23:30', 'America/Los_Angeles')` → `2026-01-16T07:30:00.000Z` (crosses into the next UTC day).
9. `('2026-01-15', '17:00:30', 'UTC')` → `2026-01-15T17:00:30.000Z` (seconds kept).
10. `('2026-13-40', '17:00', 'UTC')`, `('2026-01-15', '25:00', 'UTC')` and `('2026-01-15', '17:00', 'Not/AZone')` each throw, with a message starting `Invalid`.

`buildIcs` (use `now = new Date('2026-01-10T12:00:00Z')` and `timeZone: 'America/New_York'` unless a test says otherwise):
11. With no events and no name the whole output equals exactly `'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Calbud//Week export//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR\r\n'`.
12. With `calendarName: 'Calbud'`, the line `X-WR-CALNAME:Calbud` comes right after `METHOD:PUBLISH`.
13. A timed event `{ uid: 'prep-1', title: 'Meal prep', date: '2026-01-15', startTime: '17:00', durationMin: 90, notes: null }` produces exactly these lines between `BEGIN:VEVENT` and `END:VEVENT`: `UID:prep-1@calbud`, `DTSTAMP:20260110T120000Z`, `DTSTART:20260115T220000Z`, `DTEND:20260115T233000Z`, `SUMMARY:Meal prep`. (No `DESCRIPTION` line.)
14. `durationMin: null` gives a 60-minute event (`DTEND:20260115T230000Z` for the same start).
15. An all-day event on `2026-01-15` gives `DTSTART;VALUE=DATE:20260115` and `DTEND;VALUE=DATE:20260116`.
16. All-day roll-overs: `2026-01-31` → end `20260201`, `2026-12-31` → end `20270101`, and `2026-02-28` → end `20260301` (2026 is not a leap year).
17. Notes `'  '` (spaces only) give no `DESCRIPTION`; notes `'Buy rice'` give `DESCRIPTION:Buy rice`.
18. Escaping: a title `'a,b;c\\d'` (the characters a , b ; c backslash d) is written `SUMMARY:a\,b\;c\\d`; notes `'one\ntwo'` are written `DESCRIPTION:one\ntwo` (backslash and letter n).
19. Folding, ASCII: a title of 200 `x` characters gives physical lines that are all ≤ 75 bytes, and unfolding gives `SUMMARY:` + the 200 characters.
20. Folding, multi-byte: a title of 60 `é` characters (2 bytes each): every physical line is ≤ 75 bytes, no line is split inside a character (`Buffer.from(line).toString()` round-trips each line), and unfolding gives back the whole title.
21. Two events keep their order, and each has its own `UID`.
22. `buildIcs` with an invalid time zone throws `Invalid…` when a timed event needs it.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you believe a value in this brief is wrong, work it out from first principles, say so in your reply, and leave the test as written.

### Rules
- Don't run git commands, create `.env` files, add packages, or create files other than the two named. Don't write build output to files; read it in the terminal.
- Keep functions small. Comment only the non-obvious parts (the daylight-saving handling).

### Done when
1. `npm test` passes: every existing test plus your tests. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste its last 5 lines.**
3. You have re-read this brief and checked each rule and every test's expected value against your code.

Reply with: the files created, the pasted lines, and anything you were unsure about (especially the daylight-saving cases). Report only what you actually did and saw.

## Run
- **Model and effort:** `qwen3.8:27b (tuned server, 64k)` at **High**, Full access, web UI. One brief, run unattended overnight.
- **Wall time:** about **1 h 10 min** to a green build, at ~8 tok/s. It then spent 10+ more minutes re-checking the brief with its context at 94%, so I reviewed while it was still going.
- **Outcome:** finished the code. It wrote the 22 tests first (as told), then the code in chunks. Its first run had 21/22: it had left out `END:VEVENT`. It found and fixed that itself.

## Result
- **Builds:** yes. **Tests:** 267 passing (245 + 22).
- **Extra checks by me:**
  - **Round trip:** `localToUtc` for 7 zones (New York, London, Sydney, Kolkata, Sao Paulo, Auckland, Lord Howe) × 365 days × 6 wall times, each converted back to the zone's wall clock. Only the nonexistent spring-forward times differed, and there were few of them.
  - **Mutation:** removing the "never split inside a character" loop in `foldLine` fails the multi-byte test, so that test guards the rule.
- **Not checked:** an import into real Google Calendar or Apple Calendar. That belongs with the export button.

## What I changed
Nothing. The code is clear and small, and every rule in the brief is covered.

## Verdict
Usable as delivered. Lesson: the 27B is slow (~8 tok/s) but careful on a pure-logic brief with exact expected values, and writing the tests first worked. Tell it to stop after the build: it burned its last 10 minutes re-reading the brief.
