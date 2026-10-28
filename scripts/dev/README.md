# Review tools

Tools Claude uses to check the local model's work. Run everything from the repo root. They need only `npm install`, with no database server or network, except where noted.

| Tool | What it checks | Run |
|---|---|---|
| `check-tables.mjs` | The tables migration on PGlite (real Postgres in WASM): columns, defaults, constraints, delete behaviour. 40 checks. | `node scripts/dev/check-tables.mjs` |
| `check-security.mjs` | Both migrations with Supabase-like roles and default grants, signing in as four users: RLS, household functions, profile tampering, anon lockout, function hygiene. 81 checks. Stricter than `npm run test:db`. | `node scripts/dev/check-security.mjs [tables.sql] [security.sql]` |
| `reference-security.sql` | Claude's own version of the security migration from task 04. It must pass `check-security.mjs`, which is how the checker itself was validated. | `node scripts/dev/check-security.mjs supabase/migrations/20261027000001_tables.sql scripts/dev/reference-security.sql` |
| `check-merge.mjs` | `supabase/snippets/move-partner-into-household.sql` on PGlite: merges two solo households, keeps meal logs, refuses to run twice. | `node scripts/dev/check-merge.mjs` |
| `mock-supabase.mjs` | An in-memory stand-in for the Supabase REST calls the app makes (profiles, households, the two household functions, `foods` upsert, `meal_logs` read/insert/update/delete with RLS-like rules), for clicking through screens without touching the real project. It records every write; read them at `http://127.0.0.1:54321/__state`. `--with-logs` seeds today's entries for Alice and her partner Bob, plus one of Alice's from yesterday. | `node scripts/dev/mock-supabase.mjs [--in-household] [--with-logs]` |
| `../save-food-fixtures.mjs` | Downloads **real** USDA / Open Food Facts responses into `src/food/__fixtures__/`. The USDA key is read from `.env.local` and never printed. | `node scripts/save-food-fixtures.mjs . usda` (or `off`, `usda-branded`) |

## Clicking through screens against the mock
1. `node scripts/dev/mock-supabase.mjs --in-household`. It starts with test user Alice already in a household.
2. Build against it **without writing any file**. In PowerShell:
   `$env:VITE_SUPABASE_URL='http://127.0.0.1:54321'; $env:VITE_SUPABASE_PUBLISHABLE_KEY='placeholder'; npm run build`
3. `npm run preview -- --port 4173 --strictPort`, then open `http://localhost:4173/Calbud/`. The mock accepts a test session for its user Alice. Food searches still go to the real USDA API, using the key in `.env.local`.
4. Afterwards: stop the mock, run a plain `npm run build` again so `dist` has no test values, and clear the preview's service worker and storage.

**Never point these tools at the real Supabase project.** To change the real database, use the SQL Editor.
