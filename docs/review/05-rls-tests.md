# 05: Database security test script (three users)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`. Your job is to write **one Node script** that loads the app's two database migrations into an in-memory Postgres and proves the security rules work, by acting as three different users. Do **only** what is listed here.

### Read only these files
- This file.
- `supabase/migrations/20261027000001_tables.sql` (the tables).
- `supabase/migrations/20261027000002_security.sql` (the security rules you are testing).
- `package.json`.

Do not change either migration. If a test fails because of a migration, **leave the test failing** and say so in your reply.

### Tools
- Add the dev dependency **`@electric-sql/pglite` at exactly version `0.5.12`**: run `npm install --save-dev --save-exact @electric-sql/pglite@0.5.12`. PGlite is real Postgres compiled to WASM: `import { PGlite } from '@electric-sql/pglite'`, `const db = new PGlite()`, then `await db.exec(sql)` for SQL with several statements (no parameters) and `await db.query(sql, params)` for one statement with `$1`-style parameters (returns `{ rows, affectedRows }`).
- Use **plain Node** (no test framework, no `node --test`). Print one line per test, `PASS  <name>` or `FAIL  <name>  <detail>`, then a final `N passed, M failed` line. Exit with code 1 if anything failed. If the script crashes (an exception escapes), it must also exit with code 1.

### Create these
1. **`scripts/test-db.mjs`**.
2. In `package.json`, the script **`"test:db": "node scripts/test-db.mjs"`**. Change nothing else in `package.json` except what `npm install` adds.

### Step 1: a Supabase-like database
Supabase's own pieces don't exist in plain Postgres, so the script must create them **before** loading the migrations. Use exactly this SQL:

```sql
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create publication supabase_realtime;
```

The `alter default privileges` lines copy Supabase's real defaults: the app's roles get full table access, and **only the security rules** stop them. Don't remove them, or the tests prove nothing.

Then load the two migration files in order (read them with `fs.readFileSync`, run them with `db.exec`).

### Step 2: acting as a user
Write one helper, `as(userId, sql, params)`, that runs a single statement as a user, inside its own transaction:
1. `begin`
2. `set local role authenticated` (or `set local role anon` when `userId` is null)
3. `select set_config('request.jwt.claims', $1, true)` with `JSON.stringify({ sub: userId, role: 'authenticated' })`, or `''` for anon
4. the statement
5. `commit`, or `rollback` if it threw.

It returns `{ rows, affected }` on success or `{ error }` (the first line of the message) on failure. **Never throw out of it.** Everything else (setup, and checking results afterwards) runs as the default superuser, which ignores the security rules. That's what lets you see what *really* happened.

Watch out: a rule that blocks a row often doesn't raise an error. An `update` or `delete` just affects 0 rows, and a `select` just returns fewer rows. So for every "cannot" test, **check the data afterwards as the superuser**, or check `affected` / the row count. An error alone isn't enough.

### Step 3: the users
Insert three users into `auth.users` as the superuser. The sign-up trigger creates their profiles.
- **Alice** `00000000-0000-0000-0000-00000000000a`, email `alice@example.com`, metadata `{"display_name":"Alice"}`
- **Bob** `00000000-0000-0000-0000-00000000000b`, email `bob@example.com`, metadata `{}`
- **Carol** `00000000-0000-0000-0000-00000000000c`, email `carol@example.com`, metadata `{"display_name":""}`
- **Dave** `00000000-0000-0000-0000-00000000000d`, email `dave@example.com`, metadata `{}`

Then: Alice calls `create_household('Home')`, the superuser reads its `invite_code`, and Bob calls `join_household(<code>)`. Carol calls `create_household('Carol')`. Alice and Bob are partners; Carol is an outsider; Dave stays **without** a household (he's used to test joining).

### Step 4: the tests
Write at least these, with these names. Seed whatever rows you need (as the right user) before each group.

**Sign-up**
1. `profiles created by trigger`: all four have a profile.
2. `display name from metadata`: Alice is `Alice`.
3. `display name falls back to email`: Bob is `bob`, and Carol is `carol` (empty name).

**Households**
4. `partners share a household`: Alice and Bob have the same `household_id`; Carol's differs.
5. `invite code changes after a join`: the code Bob used no longer matches the household's code.
6. `old code cannot be reused`: Dave calling `join_household(<the code Bob used>)` errors, and Dave still has no household.
7. `cannot create a second household`: Alice calling `create_household` errors.
8. `household is full at 2`: Dave calling `join_household(<Alice's current code>)` errors, and Dave still has no household.
9. `outsider cannot read the household`: Carol selecting Alice's household returns 0 rows.

**Profiles**
10. `partner can read partner profile`: Alice sees exactly Alice and Bob.
11. `outsider sees only self`: Carol sees only Carol.
12. `can edit own display name`: Alice renames herself; the superuser sees the new name.
13. `cannot edit partner profile`: Alice renaming Bob changes nothing.
14. `cannot move to another household`: Alice setting her `household_id` to Carol's leaves it unchanged.
15. `cannot change created_at`: Alice setting her `created_at` to `2000-01-01` leaves it unchanged.

**Meal logs** (the same pattern must hold for activities: write 16–20 again for `activities` as tests 21–25)
16. `can log own meal`: Alice inserts a log for herself.
17. `cannot log as partner`: Alice inserting a log with `user_id` = Bob fails.
18. `partner can read`: Bob sees Alice's log.
19. `outsider cannot read`: Carol sees 0 of Alice's logs.
20. `partner cannot change or delete`: Bob updating and deleting Alice's log changes nothing (check as superuser).

**Shared meal prep and foods**
26. `partner can edit shared meal prep`: Alice adds a meal prep row for the household; Bob updates its title, and the superuser sees the new title.
27. `outsider cannot see or add meal prep`: Carol sees 0 rows, and inserting one with Alice's `household_id` fails.
28. `cannot move meal prep out`: Alice setting the row's `household_id` to Carol's leaves it unchanged.
29. `outsider cannot see or add foods`: as 27, for `foods`.

**Not signed in**
30. `anon reads nothing`: for each of the six tables, anon's `select` returns an error or 0 rows.
31. `anon cannot call household functions`: anon calling `create_household('x')` errors.

### Rules
- One file, plain JavaScript (ES modules), no TypeScript. Use only Node built-ins plus PGlite.
- Use the Step 1 SQL **exactly as given**, and the user ids, names and test names exactly as given.

### How to write the file (follow these steps exactly)
The finished script is about 300 lines, too long to write in one go. Build it like this:
1. **One `write`:** create `scripts/test-db.mjs` with only the imports, a PASS/FAIL helper, the Step 1 SQL, the migration loading, the `as` helper, the users from Step 3, then a line containing only `// ADD TESTS HERE`, then the final summary line and `process.exit(fail ? 1 : 0)`. Run `npm run test:db` once: it should print `0 passed, 0 failed`.
2. **One `edit` per test group** (Sign-up, Households, Profiles, Meal logs, Activities, Shared meal prep and foods, Not signed in): replace `// ADD TESTS HERE` with that group's tests **followed by a new `// ADD TESTS HERE` line**. Each edit is under about 100 lines. Run `npm run test:db` after each group, and fix that group before moving on.
3. After the last group, remove the `// ADD TESTS HERE` line.

Never rewrite the whole file with `write` after step 1. Don't create helper files (no Python, base64 or text chunks); if you made one, delete it before finishing.
- Do **not** change the migrations or any file other than `scripts/test-db.mjs` and `package.json` (and the `package-lock.json` that `npm install` updates). Do **not** run any git commands.

### Done when
1. `npm run test:db` runs to the end and prints the summary.
2. Every test passes, **or** you have explained exactly why a failing one fails.
3. You have re-read the test list above and confirmed each one is present.

Reply with: the summary line, the list of any failing tests with the reason, and anything in this brief you were unsure about.
