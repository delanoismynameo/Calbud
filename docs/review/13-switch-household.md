# 13: Join a different household (SQL and DB tests)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`, a Supabase (Postgres 17) app for two partners who share a **household**. Your job: change the `join_household` function so a person who is **alone** in their household can switch to their partner's, and add database tests for it. This is security-sensitive SQL, so correctness matters more than speed.

### Read only these files
- This file.
- `supabase/migrations/20261027000001_tables.sql`: the tables (already applied; don't change it).
- `supabase/migrations/20261027000002_security.sql`: section 4, the current `join_household`, and the comments above it (already applied; don't change it).
- `scripts/test-db.mjs`: the database tests. Look at the `as()` helper, the setup at the top, and the `// ---- summary` lines at the end.

### Today's rule, and the new one
Today `join_household(p_code)` refuses anyone who already has a household. Someone who created a household by mistake can never join their partner's.

**New behaviour.** Keep everything the function does now (signed in, profile row locked, code looked up and the target locked, full at 2, the code rotated after a join), and change only this:
1. **Already in the target household** (the code belongs to the caller's own household): raise `join_household: you are already in that household`.
2. **The caller is in a household that has another member:** raise `join_household: you are already in a household with someone`. Nothing changes.
3. **The caller is alone in their current household** (they are its only member): lock that household's row (`for update`), then **move them into the target and delete their old household**, keeping their data:
   - **Meal logs** belong to the user, not the household, so they stay. But some point at foods (`meal_logs.food_id`) of the old household, and deleting the household would cascade-delete those foods, setting `food_id` to null. So:
     a. **Foods the target already has** (same `source` and `source_id`): re-point the caller's meal logs from the old food to the target's matching food. The old copy is then deleted together with the old household.
     b. **All other foods of the old household:** move them to the target (`update foods set household_id = <target>`).
   - **`meal_prep` rows** of the old household: move them to the target.
   - Then set the caller's `household_id` to the target, and **after that** delete the old household row. Order matters: `profiles.household_id` is `on delete set null`.
4. **The caller has no household:** exactly as today.

All of it happens in the one function call, so it either all happens or none of it does. Check the member count of the caller's household and the target's while their rows are locked.

### Create this file
**`supabase/migrations/20261028000001_join_switch.sql`**
- A comment header saying what changed and why.
- `create or replace function public.join_household(p_code text)` with the same signature, `returns uuid`, `language plpgsql`, `security definer`, `set search_path = ''`, and fully qualified names (`public.profiles`, …) everywhere.
- Repeat `revoke execute on function public.join_household(text) from public, anon;` and `grant execute on function public.join_household(text) to authenticated;` at the end.
- Write the file in **two writes**: first everything up to and including the checks (steps 1, 2 and the "not found" and "full" errors), then use one `edit` to add the moving part and the end.

### Change this file: `scripts/test-db.mjs`
It is over 300 lines. **Don't rewrite it.** Make exactly two `edit`s:

**Edit 1.** Right after the line that loads `20261027000002_security.sql`, add one line that loads `supabase/migrations/20261028000001_join_switch.sql` the same way.

**Edit 2.** Right **before** the line `// ---- summary ---…`, insert a new block that starts with `// ---- Switching households ----` and is wrapped in `{ … }` like the other blocks. It uses **new users only** (don't touch Alice, Bob, Carol or Dave, because earlier blocks rely on them):
- Create users `ERIN` (`…00e`), `FRANK` (`…00f`) and `GINA` (`…0010`) with `newUser`, the same way as the others.
- **Setup:**
  - Erin and Frank each `create_household` (as themselves).
  - As the superuser (`db.query`, not `as`), insert into Erin's household:
    - food `A` (`source 'usda'`, `source_id '111'`)
    - food `B` (`source 'usda'`, `source_id '222'`)
    - one `meal_prep` row
  - Insert into Frank's household: food `B2` (`source 'usda'`, `source_id '222'`).
  - Insert two of Erin's `meal_logs` for today: one pointing at `A`, one at `B`.
  - Read Frank's current invite code as the superuser.
- **Then Erin calls `join_household` with Frank's code. Tests (one `ok` each):**
  1. `solo member can switch households`: no error, and Erin's `household_id` is now Frank's.
  2. `old solo household is deleted`: Erin's old household row no longer exists.
  3. `meal logs survive the switch`: Erin still has 2 meal logs, and neither has a null `food_id`.
  4. `new foods move with her`: food `A` now has Frank's `household_id`, and Erin's log still points at `A`.
  5. `duplicate foods re-point to the partner's copy`: Erin's other log now points at `B2`, and `B` no longer exists.
  6. `meal prep moves with her`: the `meal_prep` row now has Frank's `household_id`.
  7. `code rotates after a switch`: Frank's household's invite code changed.
- **More cases:**
  8. `cannot rejoin your own household`: Erin calls `join_household` with her household's **current** code (read it as the superuser). She gets an error, and her `household_id` is unchanged.
  9. `cannot leave a partner behind`: Gina `create_household`s. Then Alice (who is in a household with Bob) calls `join_household` with Gina's code. She gets an error, Alice's `household_id` is unchanged, and Gina's household still has exactly 1 member.
  10. `full household refuses a solo member`: Gina calls `join_household` with Frank's current code (Frank's household has 2 members now). She gets an error, Gina is still in her own household, and that household still exists.
  11. `bad code keeps the solo household`: Gina calls `join_household('nope1234')`. She gets an error, and her household and her membership are unchanged.

Each `ok` gets a `detail` string that shows the actual values, like the existing tests do.

### Rules
- Don't change the two existing migrations or any other file. Don't run git commands. Don't create `.env` files.
- Run the tests with `npm run test:db` (not `node --test`).
- Don't weaken or delete existing tests to make things pass.

### Done when
1. `npm run test:db` prints **`42 passed, 0 failed`** (the 31 existing tests plus your 11).
2. `npm test` still passes.
3. You have re-read this brief section by section, and re-read your SQL against the four numbered rules.

Reply with: the files created and changed, and **paste the last line `npm run test:db` printed**, plus anything you were unsure about. Report only what you actually did and saw.
