# 47: Download your data (food log as CSV, everything as JSON)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for two people logging food. Add a **Your data** card on the Us page with two buttons:
- **Food log (CSV):** every food you have logged, one row each, to open in a spreadsheet.
- **Everything (JSON):** your profile, your food log, your activities, and the household's foods, prep sessions and menu.

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Check your work by reading it. The reviewer runs the type check, `npm test` and `npm run build`, and clicks through it afterwards.

### Already done (don't redo)
- **`src/today/types.ts`:** `MealLog` (`logged_on`, `meal_type`, `name`, `quantity_g`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `created_at`, …).
- **`src/lib/download.ts`:** `downloadFile(file)`.
- **`src/calendar/exportWeek.ts`:**
  - `isIosStandalone(userAgent, maxTouchPoints, standalone)`;
  - `deliverIcs(file, preferShare, nav, download, title)`, which shares on an installed iPhone app, otherwise downloads, and returns `'shared' | 'downloaded' | 'cancelled'`;
  - `ShareNav`.
- **`src/activities/ExportButton.tsx`:** how those are used together, including working out `standalone`. Copy that pattern.
- **`src/lib/useLocalDate.ts`:** `useLocalDate()` gives today as `'YYYY-MM-DD'`.
- **Row limit:** the database returns at most 1000 rows per request, so reads must page.

### Read only these files
- This file.
- `src/activities/ExportButton.tsx`, `src/today/types.ts`, `src/today/mealLogApi.ts` (only `fetchMealLogs`), `src/pages/Us.tsx`.
- The first 20 lines of `src/calendar/exportWeek.test.ts`, for the test style.

### 1. `src/household/dataExport.ts` (new, pure)
```ts
import type { MealLog } from '../today/types'

// One CSV cell: null → ''. A value containing a comma, a double quote, '\n' or '\r' is wrapped in double quotes, with each " doubled. Numbers as String(n).
export function csvCell(value: string | number | null): string

// Header 'date,meal,food,grams,calories,protein_g,carbs_g,fat_g', then one line per log, sorted by logged_on then created_at (oldest first; the input array is not changed).
// Columns: logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g. Lines end with '\r\n', including the last.
export function mealLogsCsv(logs: MealLog[]): string

// 'calbud-food-log-2026-10-29.csv' and 'calbud-data-2026-10-29.json'.
export function dataFileName(kind: 'csv' | 'json', today: string): string
```

### 2. `src/household/dataExport.test.ts` (new): one `it` each
Helper `log(overrides)`: `id: 'l1'`, `user_id: 'me'`, `logged_on: '2026-10-29'`, `meal_type: 'lunch'`, `food_id: null`, `name: 'Rice'`, `quantity_g: 150`, `kcal: 195`, `protein_g: 4`, `carbs_g: 42.3`, `fat_g: 0.4`, `created_at: '2026-10-29T12:00:00Z'`.
1. `csvCell`: `'Rice'` → `'Rice'`; `'Pasta, cooked'` → `'"Pasta, cooked"'`; `'5" sub'` → `'"5"" sub"'`; `'a\nb'` → `'"a\nb"'`; `42.3` → `'42.3'`; `null` → `''`.
2. `mealLogsCsv([log()])` equals `'date,meal,food,grams,calories,protein_g,carbs_g,fat_g\r\n2026-10-29,lunch,Rice,150,195,4,42.3,0.4\r\n'`.
3. Order: given `log({ id: 'b', name: 'B', created_at: '2026-10-29T18:00:00Z' })`, `log({ id: 'c', name: 'C', logged_on: '2026-10-28' })` and `log({ id: 'a', name: 'A', created_at: '2026-10-29T08:00:00Z' })`, the food column reads C, A, B. The input array is not changed.
4. A name with a comma is quoted inside the line: `log({ name: 'Pasta, cooked' })` gives the line `'2026-10-29,lunch,"Pasta, cooked",150,195,4,42.3,0.4'`.
5. `mealLogsCsv([])` equals the header line plus `'\r\n'` only.
6. `dataFileName('csv', '2026-10-29')` → `'calbud-food-log-2026-10-29.csv'`; `dataFileName('json', '2026-10-29')` → `'calbud-data-2026-10-29.json'`.

**Never change a test's expected value to make it pass.**

### 3. `src/household/exportApi.ts` (new)
```ts
// Every row of `table` (select '*'), optionally only where `column` equals `value`, ordered by `order` ascending.
// Pages with .range(from, from + 999) until a page comes back with fewer than 1000 rows. Throws Error(error.message) on an error.
export async function allRows(table: string, order: string, column?: string, value?: string): Promise<Record<string, unknown>[]>

// The JSON export: { exported_at: new Date().toISOString(), profile, meal_logs, activities, foods, meal_prep, menu_slots }.
//  profile: the one profiles row with id = userId (or null);
//  meal_logs: allRows('meal_logs', 'logged_on', 'user_id', userId);
//  activities: allRows('activities', 'scheduled_date', 'user_id', userId);
//  foods: allRows('foods', 'created_at');
//  meal_prep: allRows('meal_prep', 'scheduled_date');
//  menu_slots: allRows('menu_slots', 'slot_date').
// The database already limits foods, meal_prep and menu_slots to the household.
export async function fetchAllData(userId: string): Promise<Record<string, unknown>>
```
Use `supabase` from `../lib/supabase`, as `mealLogApi.ts` does. In `allRows`, build the query, then apply `.eq(column, value)` only when `column` is given, then `.order(order, { ascending: true }).range(…)`.

### 4. `src/household/DataCard.tsx` (new)
Start it **exactly** like this. All the hooks come first and the guard comes after them. Add no hook anywhere else.
```tsx
export default function DataCard() {
  const { session } = useAuth()
  const today = useLocalDate()
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  if (!session) return null
  // … plain async functions below (no useCallback or useMemo)
```
- **Card:** `bg-slate-800 rounded-lg p-4 text-left space-y-3`.
  - Heading `Your data` in `text-sm font-semibold text-gray-400`.
  - Under it, in `text-xs text-gray-500`: `Download what you've logged. The food log opens in a spreadsheet; the full file has everything.`
- **Two buttons** in a `grid grid-cols-2 gap-2` row: **Food log (CSV)** and **Everything (JSON)**.
  - Style: `py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800 disabled:opacity-50`, and `type="button"`.
  - Both are disabled while `busy` is not null. The busy one reads `Preparing…`.
- **The deliver step,** a plain function: `preferShare` and `standalone` worked out exactly as in `ExportButton`, then `deliverIcs(file, preferShare, navigator as unknown as ShareNav, downloadFile, 'Calbud data')`.
- **CSV:**
  - `logs = (await allRows('meal_logs', 'logged_on', 'user_id', session.user.id)) as unknown as MealLog[]`;
  - `file = new File([mealLogsCsv(logs)], dataFileName('csv', today), { type: 'text/csv' })`;
  - deliver it;
  - unless the result is `'cancelled'`, the message is `Downloaded ${logs.length} entries.` (`1 entry` for one).
- **JSON:**
  - `data = await fetchAllData(session.user.id)`;
  - `file = new File([JSON.stringify(data, null, 2)], dataFileName('json', today), { type: 'application/json' })`;
  - deliver it;
  - unless the result is `'cancelled'`, the message is `Downloaded everything.`
- **Errors:** wrap each in `try/catch/finally`.
  - Clear `message` at the start.
  - **A thrown error shows its `message` in `text-red-400 text-xs` (set `failed`), and `busy` goes back to null in `finally`.**
  - A success message is `text-green-400 text-xs`.

### 5. `src/pages/Us.tsx`
- After the `GoalsCard` wrapper div, add `<div className="max-w-sm mx-auto"><DataCard /></div>`. Add the import. Change nothing else.

### Rules
- **Files:**
  - create only `src/household/dataExport.ts`, `src/household/dataExport.test.ts`, `src/household/exportApi.ts` and `src/household/DataCard.tsx`
  - change only `src/pages/Us.tsx`
  - **never edit any file under `docs/`**
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Import the existing helpers; do not write a second copy. Use `import type` for types.

### Done when
1. The files above are written as described.
2. You have re-read this brief and checked every test's expected value against your code by hand.

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.
