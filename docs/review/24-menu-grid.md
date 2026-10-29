# 24: The shared weekly menu

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Vite + React 19 + TypeScript + Tailwind 4 app using TanStack Query and Supabase. The **Prep** page plans when food is cooked (`meal_prep` rows). Your job is a **menu**: what the household eats at breakfast, lunch and dinner on each day of the week.
- The menu is a grid, with days down the side and the three meals across.
- One cell is a **slot**. It holds free text ("OYO", "Sandwich, fruit cup"), or one of the week's prep dishes. Leftovers come from one batch filling several slots.
- The menu is **shared** by the household and updates live.
- The **Today** screen shows today's three slots. A slot whose dish has nutrition gets a one-tap Log.

### Already done (don't redo)
- **The table:** `menu_slots` has these columns:
  - `id uuid`, `household_id uuid`
  - `slot_date date`
  - `meal text`: `'breakfast'`, `'lunch'` or `'dinner'`
  - `label text`, which is required and 1–200 characters after trimming
  - `prep_id uuid null`, which references `meal_prep(id)` (`on delete set null`)

  It has `unique (household_id, slot_date, meal)`, so a slot is one row, and **an empty slot has no row**. Either partner can read and change any of the household's rows, and the table is in the Realtime publication.
- **Dish nutrition:** a `MealPrep` has `foods: FoodRowFromDb | null`, its dish's food. `foodResultFromRow()` in `src/food/recents.ts` turns that into a `FoodResult` for `ServingPicker`.
- **Week helpers:** `weekStart`, `weekDays`, `dayLabel`, `addDays` are in `src/prep/week.ts`.

### Read only these files
- This file.
- `src/prep/types.ts`, `src/prep/prepApi.ts`, `src/prep/usePrepWeek.ts`, `src/prep/usePrepRealtime.ts`, `src/prep/week.ts`.
- `src/prep/PrepForm.tsx`: for the form style only.
- `src/pages/Prep.tsx`, `src/pages/Today.tsx`, `src/food/ServingPicker.tsx`: files you change.
- `src/food/recents.ts`: for `FoodRowFromDb` and `foodResultFromRow`.
- The first 30 lines of `src/prep/grocery.test.ts`, for the test style.

### Write in this order. Run `npm test` after step 2 before you continue.

### 1. `src/menu/types.ts`
```ts
import type { FoodRowFromDb } from '../food/recents'
export type MenuMeal = 'breakfast' | 'lunch' | 'dinner'
export const MENU_MEALS: MenuMeal[] = ['breakfast', 'lunch', 'dinner']
export interface MenuSlot {
  id: string
  household_id: string
  slot_date: string        // 'YYYY-MM-DD'
  meal: MenuMeal
  label: string
  prep_id: string | null
  meal_prep: { title: string; foods: FoodRowFromDb | null } | null   // embedded, see step 3
}
```

### 2. `src/menu/menu.ts` and `src/menu/menu.test.ts`
```ts
export function mealLabel(meal: MenuMeal): string
export function slotAt(slots: MenuSlot[], date: string, meal: MenuMeal): MenuSlot | undefined
export function menuCount(slots: MenuSlot[], prepId: string): number
export function parseSlotLabel(text: string): { ok: true; label: string } | { ok: false; error: string }
```
- **`mealLabel`:** the meal with a capital first letter, for example `'Breakfast'`.
- **`slotAt`:** the slot with that `slot_date` and `meal`, or `undefined`.
- **`menuCount`:** how many slots have `prep_id === prepId`.
- **`parseSlotLabel`:**
  - trim the text
  - if it's empty, the error is `Type something or pick a dish.`
  - if it's longer than 200 characters, the error is `Keep it under 200 characters.`
  - otherwise return `{ ok: true, label: trimmed }`

Tests, one `it` each. A helper `slot(o: Partial<MenuSlot>)` builds a `MenuSlot` with `id: 's1'`, `household_id: 'h1'`, `slot_date: '2026-10-26'`, `meal: 'dinner'`, `label: 'Curry'`, `prep_id: null`, `meal_prep: null`, then the overrides:
1. `mealLabel('breakfast')` is `'Breakfast'` and `mealLabel('dinner')` is `'Dinner'`.
2. With slots `[slot({ id: 'a' }), slot({ id: 'b', meal: 'lunch' })]`:
   - `slotAt(slots, '2026-10-26', 'lunch')?.id` is `'b'`
   - `slotAt(slots, '2026-10-26', 'breakfast')` is `undefined`
   - `slotAt(slots, '2026-10-27', 'dinner')` is `undefined`
3. With three slots of `prep_id: 'p1'`, one of `'p2'` and one of `null`, `menuCount(slots, 'p1')` is `3` and `menuCount(slots, 'p3')` is `0`.
4. `parseSlotLabel('  OYO ')` is `{ ok: true, label: 'OYO' }`.
5. `parseSlotLabel('   ')` is `{ ok: false, error: 'Type something or pick a dish.' }`.
6. `parseSlotLabel('x'.repeat(200)).ok` is `true`, and `parseSlotLabel('x'.repeat(201))` is `{ ok: false, error: 'Keep it under 200 characters.' }`.

**Never change a test's expected value to make it pass.** If a test fails, fix the code. If you think this brief's value is wrong, say so in your reply and leave the test as written.

### 3. `src/menu/menuApi.ts`
Write it like `src/prep/prepApi.ts`, throwing `new Error(error.message)` on errors.
- **`fetchMenuWeek(householdId: string, start: string): Promise<MenuSlot[]>`:** `menu_slots` with `.select('*, meal_prep(title, foods(*))')`, `.eq('household_id', householdId)`, `.gte('slot_date', start)`, `.lte('slot_date', addDays(start, 6))`, `.order('slot_date')`.
- **`saveSlot(householdId: string, date: string, meal: MenuMeal, label: string, prepId: string | null): Promise<void>`:**
  - upsert `{ household_id: householdId, slot_date: date, meal, label, prep_id: prepId }` with `{ onConflict: 'household_id,slot_date,meal' }`, then `.select('id')`
  - this both adds a slot and replaces one
- **`clearSlot(id: string): Promise<void>`:**
  - delete with `.eq('id', id).select('id')`
  - throw `That slot could not be cleared.` when no row comes back

### 4. `src/menu/useMenuWeek.ts`
`export function useMenuWeek(start: string)`, just like `usePrepWeek`, but with `queryKey: ['menu', householdId, start]` and `fetchMenuWeek`.

### 5. Change `src/prep/usePrepRealtime.ts`
On the **same channel**, also listen to `menu_slots`, in the same three ways as `meal_prep`:
- INSERT and UPDATE with the household filter
- DELETE without a filter

These call a second function that invalidates `['menu']`. Keep everything else.

### 6. Change `src/food/ServingPicker.tsx`
Add an optional prop `meal?: MealType`. The meal state starts as `meal ?? defaultMealType()`. Change nothing else.

### 7. `src/menu/MenuGrid.tsx`
`export default function MenuGrid({ days, today, slots, onPick }: { days: string[]; today: string; slots: MenuSlot[]; onPick: (date: string, meal: MenuMeal) => void })`
- **The grid:** a `grid grid-cols-[3rem_1fr_1fr_1fr] gap-1 px-3` grid.
- **The header row:** an empty cell, then `mealLabel` of each meal, in small grey text.
- **One row per day:**
  - **The first cell** is the weekday on top (`dayLabel(day).slice(0, 3)`, e.g. `Sun`) and the day number under it (`Number(day.slice(8))`), in small text. It is blue (`text-blue-400`) when `day === today`, grey otherwise.
  - **Then one button per meal** (`MENU_MEALS`):
    - styled `min-h-[3.5rem] rounded bg-slate-800 hover:bg-slate-700 p-1 text-xs text-left break-words`
    - **filled** (`slotAt` finds a slot): shows its `label`, in `line-clamp-3`, and in `text-blue-300` when the slot has a `prep_id`, white otherwise
    - **empty:** shows a centred grey `+`
    - its `aria-label` is `` `${dayLabel(day)}, ${mealLabel(meal)}: ${slot ? slot.label : 'empty'}` ``
    - clicking calls `onPick(day, meal)`

### 8. `src/menu/SlotEditor.tsx`
`export default function SlotEditor({ date, meal, slot, dishes, onClose }: { date: string; meal: MenuMeal; slot?: MenuSlot; dishes: MealPrep[]; onClose: () => void })`

Style it like `PrepForm`: the same container, input and button classes.
- **State:**
  - `text`, initially `slot?.label ?? ''`
  - `prepId`, initially `slot?.prep_id ?? null`
  - `error: string | null`
- **The heading:** `` `${dayLabel(date)} · ${mealLabel(meal)}` ``.
- **If `dishes` is not empty:**
  - a small label `This week's dishes`
  - a wrapping row of buttons, one per dish:
    - the text is its `title`
    - `aria-pressed={prepId === dish.id}`, blue when pressed, `bg-slate-700` otherwise
    - clicking sets `prepId = dish.id`, `text = dish.title`, and clears the error
- **A text input**, with `<label htmlFor="slot-label">Or type it</label>` and the placeholder `OYO, sandwich, eat out…`. Typing sets `text`, sets `prepId = null` (typing unlinks the dish), and clears the error. The error shows under it in red.
- **Buttons:**
  - **Save:** blue, `flex-1`
  - **Cancel:** grey
  - **if `slot` exists, Clear:** grey, with red text. It runs a second mutation, `clearSlot(slot.id)`.
- **Save:**
  1. Run `parseSlotLabel(text)`.
  2. If it isn't ok, set the error and stop.
  3. Otherwise the mutation calls `saveSlot(householdId, date, meal, label, prepId)`. `householdId` is `useProfile().profile?.household_id`; if it is missing, throw `Join or create a household first.`
- **On success (both mutations):** invalidate `['menu']`, then `onClose()`.
- **While pending:** both mutations disable all buttons. A failed mutation shows its `error.message` in red.

### 9. Change `src/pages/Prep.tsx`
- **The view switch:** `view` becomes `'plan' | 'menu' | 'grocery'`, with three buttons in this order: `Plan`, `Menu`, `Grocery list`. Keep the same styles.
- **Menu data:**
  - add `const menu = useMenuWeek(start)`
  - add state `slotEditing: { date: string; meal: MenuMeal } | null`
  - **every hook stays above every early return**
- **A new early return,** after the existing two: `if (slotEditing)` render `SlotEditor`:
  - `date` and `meal` from the state
  - `slot={slotAt(menu.data ?? [], slotEditing.date, slotEditing.meal)}`
  - `dishes={data ?? []}`
  - `onClose={() => setSlotEditing(null)}`
- **The menu view:**
  - while `menu.isLoading`, show the same `Loading…`
  - on `menu.error`, show the same error block, with `menu.refetch`
  - otherwise show `<MenuGrid days={weekDays(start)} today={today} slots={menu.data ?? []} onPick={(date, meal) => setSlotEditing({ date, meal })} />`
  - under the grid, a small grey hint: `Tap a meal to fill it. Dishes come from this week's prep.`
- **The Plan and Grocery list views** keep their current behaviour.
- **`sessionDetails`:**
  - it takes a second argument, `menuSlots: MenuSlot[]`
  - when `menuCount(menuSlots, s.id) > 0`, add `` `${n} in menu` `` right after the servings part
  - pass `menu.data ?? []`

### 10. `src/menu/TodayMenu.tsx`
`export default function TodayMenu({ date, onLog }: { date: string; onLog: (food: FoodResult, meal: MenuMeal) => void })`
- **Data:**
  - `const { data } = useMenuWeek(weekStart(date))`
  - `todays` is the slots with `slot_date === date`
  - if `todays` is empty (or still loading), render `null`
- **Otherwise a card** (`bg-slate-800 rounded-lg p-4 space-y-2`):
  - **a header row:** `Today's menu` (semibold), and on the right a `<Link to="/prep">` with the text `Edit` (`text-sm text-blue-400`)
  - **one row per meal in `MENU_MEALS`:**
    - the meal label, in a fixed `w-20` grey column
    - then the slot's label, or `—` in grey when empty
    - **if the slot's `meal_prep?.foods` is set,** a small blue `Log` button on the right:
      - `aria-label={'Log ' + slot.label + ' for ' + mealLabel(meal)}`
      - it calls `onLog(foodResultFromRow(slot.meal_prep.foods), meal)`

### 11. Change `src/pages/Today.tsx`
- **New state:** `logging: { food: FoodResult; meal: MenuMeal } | null`, declared above any early return.
- **When `logging` is set,** return `<ServingPicker food={logging.food} meal={logging.meal} onLogged={() => setLogging(null)} onCancel={() => setLogging(null)} />`. Put this after all hooks.
- **Where it goes:** render `<TodayMenu date={date} onLog={(food, meal) => setLogging({ food, meal })} />` right after the `Add food` link in the normal (non-error) branch, before the meal sections.

### Rules
- **Files:**
  - create only the files listed
  - change only `src/prep/usePrepRealtime.ts`, `src/food/ServingPicker.tsx`, `src/pages/Prep.tsx` and `src/pages/Today.tsx`
  - you may also add the field `meal_prep: null` to a test's `MenuSlot` object if the types require it
  - don't create any other files
- **Don't:** run git commands, create `.env` files, or add packages.
- **Writing:** write each new file in one write, then fix with small `edit`s.
- **Tests:** run them with `npm test`, not `node --test`.

### Done when
1. `npm test` passes: every existing test plus your 6. **Paste the `Tests` line it prints.**
2. `npm run build` finishes with no errors. **Paste the last 5 lines it prints**, exactly as printed, starting from the line after `✓ built in`.
3. You have re-read this brief, and checked each numbered section and every test's expected value against your code.

Reply with: the files created and changed, the pasted lines, and anything you were unsure about. Report only what you actually did and saw.
