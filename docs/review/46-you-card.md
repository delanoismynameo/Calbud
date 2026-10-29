# 46: A "You" card on the Us page: name, colour and time zone

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app for two people. Each person's name, colour and time zone are set once during first-run setup and can't be changed afterwards. The time zone matters: exported calendar files use it. Add a **You** card on the Us page to change all three, built like the existing goals card (`src/household/GoalsCard.tsx`).

### Important: you cannot run npm or node in this run
The sandbox blocks `npm`, `npx` and `node` (you will get EPERM). **Do not try to run them, and do not work around it** (no other shells, no `cmd /c`, no execution-policy changes). Check your work by reading it. The reviewer runs the type check, `npm test` and `npm run build`, and clicks through it afterwards.

### Already done (don't redo)
- **`src/household/colors.ts`:** `COLORS`, the six colour hex codes offered in setup.
- **`src/household/useProfile.ts`:** `useProfile()` gives `profile` (with `display_name`, `color`, `timezone`) and `refresh()`.
- **`src/household/GoalsCard.tsx`:** the pattern to follow. A read view with **Edit**; an edit view with fields, **Save** and **Cancel**; `supabase.from('profiles').update({...}).eq('id', session!.user.id)`; then `await refresh()`.
- **The database** already lets you update your own `display_name`, `color` and `timezone`.

### Read only these files
- This file.
- `src/household/GoalsCard.tsx` (all of it), `src/household/colors.ts`, `src/pages/Us.tsx`.
- The first 20 lines of `src/household/goals.test.ts`, for the test style.

### 1. `src/household/profileEdit.ts` (new, pure)
```ts
export interface ProfileInput { name: string; color: string; timezone: string }

// name: trimmed, 1 to 40 characters, else 'Enter a name (up to 40 characters).'
// color: one of COLORS, else 'Pick a colour.'
// timezone: one of `zones`, else 'Pick a time zone.'
// ok gives { display_name: the trimmed name, color, timezone }.
export function parseProfileEdit(input: ProfileInput, zones: string[]):
  | { ok: true; changes: { display_name: string; color: string; timezone: string } }
  | { ok: false; errors: Partial<Record<keyof ProfileInput, string>> }

// The zones to offer: `supported`, plus `current` when it is missing from it, sorted alphabetically (a new array).
export function timeZones(supported: string[], current: string): string[]

// 'America/New_York' → 'America / New York', 'UTC' → 'UTC': every '/' becomes ' / ' and every '_' a space.
export function zoneLabel(zone: string): string
```

### 2. `src/household/profileEdit.test.ts` (new): one `it` each
Use `const zones = ['America/Denver', 'America/New_York', 'Europe/London']`.
1. `parseProfileEdit({ name: '  Alice ', color: '#6366f1', timezone: 'America/Denver' }, zones)` → ok with `{ display_name: 'Alice', color: '#6366f1', timezone: 'America/Denver' }`.
2. Name `'   '` and a 41-character name each give the name error. A 40-character name is ok.
3. Colour `'#123456'` gives `'Pick a colour.'`; time zone `'Mars/Base'` gives `'Pick a time zone.'`. All three bad at once gives all three errors.
4. `timeZones(['Europe/London', 'America/Denver'], 'America/Denver')` → `['America/Denver', 'Europe/London']`. `timeZones(['Europe/London'], 'Asia/Tokyo')` → `['Asia/Tokyo', 'Europe/London']`. The input array is not changed.
5. `zoneLabel('America/New_York')` → `'America / New York'`; `zoneLabel('America/Argentina/Buenos_Aires')` → `'America / Argentina / Buenos Aires'`; `zoneLabel('UTC')` → `'UTC'`.

**Never change a test's expected value to make it pass.**

### 3. `src/household/YouCard.tsx` (new)
Start the component **exactly** like this. All the hooks come first and the guard comes after them. Add no hook anywhere else.
```tsx
export default function YouCard() {
  const { profile, refresh } = useProfile()
  const { session } = useAuth()
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState<ProfileInput>({ name: '', color: '', timezone: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!profile) return null

  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
  const zones = timeZones(supported, profile.timezone)
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  // … plain functions below (no useCallback or useMemo)
```
- **Card:** the same wrapper classes and header layout as `GoalsCard`, with the heading `You`.
- **Read view:**
  - a `w-3 h-3 rounded-full inline-block mr-2` dot in `profile.color`, then `profile.display_name`;
  - then, in `text-sm text-gray-400`, `Time zone: ${zoneLabel(profile.timezone)}`;
  - when `deviceZone` differs from `profile.timezone`, an extra `text-xs text-amber-400` line: `This phone is set to ${zoneLabel(deviceZone)}.`
  - an **Edit** button like GoalsCard's, which fills `input` from the profile and clears `errors` and `saveError`.
- **Edit view:**
  - **Name:** `<input id="you-name">`, labelled `Name`.
  - **Colour:** a row of six round buttons, one per `COLORS` entry: `type="button"`, `w-8 h-8 rounded-full`, `style={{ backgroundColor: c }}`, `aria-label={`Colour ${c}`}`, `aria-pressed={input.color === c}`. The chosen one gets `ring-2 ring-white`.
  - **Time zone:** `<select id="you-timezone">`, labelled `Time zone`, with one `<option value={z}>{zoneLabel(z)}</option>` per zone.
  - When `deviceZone` differs from `input.timezone` and is in `zones`: a `text-sm text-blue-400 underline` button, `Use this phone's time zone (${zoneLabel(deviceZone)})`, that sets `input.timezone = deviceZone`.
  - Each field's error under it in `text-red-400 text-xs`.
  - **Save:** `parseProfileEdit(input, zones)`; on errors, show them. Otherwise update `profiles` with `changes` (as GoalsCard does), then `await refresh()` and close the editor. A failed update shows its message in `saveError`, and `saving` is reset in every path.
  - **Cancel:** closes the editor.
- Use the same input and button classes as `GoalsCard`.

### 4. `src/pages/Us.tsx`
- Right before the `GoalsCard` wrapper (`<div className="max-w-sm mx-auto"><GoalsCard />…`), add `<div className="max-w-sm mx-auto"><YouCard /></div>`. Add the import. Change nothing else.

### Rules
- **Files:**
  - create only `src/household/profileEdit.ts`, `src/household/profileEdit.test.ts` and `src/household/YouCard.tsx`
  - change only `src/pages/Us.tsx`
  - **never edit any file under `docs/`**
- **Don't:** run git, npm, npx or node; create `.env` files; add packages; create any other files.
- **Writing:** write each new file in one write, then fix with small edits. Import `COLORS`; do not copy it. Use `import type` for types. Keep JSX ternaries shallow.

### Done when
1. The files above are written as described.
2. You have re-read this brief and checked every test's expected value against your code by hand.

Reply with: the files created and changed, and anything you were unsure about. Report only what you actually did.
