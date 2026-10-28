# 04: Supabase security migration (RLS, profile trigger, household functions)

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`. Your job is to write **one SQL migration file** that secures the database: row level security policies, a trigger that creates profiles, and two household functions. This task needs design work, so think it through carefully. Correctness matters more than speed.

### Read only these files
- This file.
- `supabase/migrations/20261027000001_tables.sql`: the six tables you are securing (already applied). Do not change it.

### The app
Two partners share a **household**. Each signed-in user has a **profile** row (same `id` as their `auth.users` row). Partners must see **each other's** data, but only change their own personal data. Shared household data (meal prep, foods) can be changed by either partner. Nobody outside the household may see anything.

### What Supabase provides (do not create these)
- `auth.users` with columns `id uuid`, `email text`, `raw_user_meta_data jsonb`.
- `auth.uid()`: returns the signed-in user's id, or null when not signed in.
- Roles `anon` (not signed in) and `authenticated` (signed in). The app connects as one of these.
- A publication named `supabase_realtime`.
- RLS is already enabled on all six tables, with no policies.

### Create this file
`supabase/migrations/20261027000002_security.sql`

It must contain:

**1. `public.my_household()`**: returns the calling user's `household_id` (null if none). Policies use it to avoid querying `profiles` inside a `profiles` policy, which would recurse.

**2. Profile creation on sign-up**: a function `public.handle_new_user()` and a trigger `on_auth_user_created` (after insert on `auth.users`, for each row). It inserts a `profiles` row with `id = new.id`. Set `display_name` from `raw_user_meta_data->>'display_name'`; if that is missing or empty, use the part of `email` before the `@`. Leave everything else at the column defaults.

**3. `public.create_household(p_name text) returns uuid`**: creates a household, puts the caller in it, and returns its id. Raise an error if the caller is not signed in, or is already in a household.

**4. `public.join_household(p_code text) returns uuid`**: puts the caller in the household with that `invite_code`, and returns its id. Raise an error if:
- the caller is not signed in,
- the caller is already in a household,
- no household has that code, or
- that household already has **2** members.
After a successful join, **replace that household's `invite_code` with a new random 8-character code**, so the code can't be reused.

**5. Row level security policies.** Policies are for the `authenticated` role only. `anon` must not be able to read or change anything.

| Table | Read | Insert / update / delete |
|---|---|---|
| `households` | only your own household | none. Changes happen only through the two functions above |
| `profiles` | your own profile, and profiles in your household | update **your own** profile only. No insert or delete (the trigger creates profiles; deleting the auth user cascades) |
| `meal_logs` | your own rows, and rows of users in your household | your own rows only (`user_id` must be you, both before and after the change) |
| `activities` | same as `meal_logs` | same as `meal_logs` |
| `meal_prep` | rows of your household | any row of your household, and the row must stay in your household |
| `foods` | same as `meal_prep` | same as `meal_prep` |

**Important:** a user must **not** be able to move themselves into another household by updating `profiles.household_id` directly. Joining must go through `join_household`. Users also must not be able to change their profile's `id`. Choose a way to enforce this (a policy alone may not be enough), and explain your choice in a SQL comment.

**6. Function safety.** Every function that runs as `security definer` must set an empty search path (`set search_path = ''`) and use fully schema-qualified names (`public.profiles`, `auth.uid()`, and so on). The `execute` privilege on the household functions and `my_household()` goes to `authenticated` only: revoke it from `public` and `anon`.

**7. Realtime.** Add `meal_prep`, `meal_logs` and `activities` to the `supabase_realtime` publication.

### Rules
- Plain SQL. Comment each section briefly.
- In policies, write `(select auth.uid())` rather than bare `auth.uid()`. Supabase recommends this because it evaluates once per query, not once per row.
- Write the file in pieces of no more than about 100 lines.
- Do **not** change the tables migration or any other file. Do **not** run any git commands.

### Done when
1. The file exists at exactly `supabase/migrations/20261027000002_security.sql`.
2. Re-read it against this brief, section by section.

Afterwards it will be run against a real Postgres database with the Supabase pieces above, and tested by signing in as several different users. Reply with a short summary of each section, how you stopped users changing their own `household_id`, and anything you were unsure about.

## Run
The same brief and message went to two models, one after the other, each in a fresh web UI session (Workspace Write, Calbud workspace). No commands were needed.

| | Qwen 3.8 27B (tuned server, 64k) | Swift 1.5 27B (Q3_K_M, 64k) |
|---|---|---|
| Wall time | **1 h 0 min 47 s** | **37 min 16 s** |
| Speed / tokens | 8.5 tok/s, 12 steps, 436K tokens | 18 tok/s, 20 steps, 930K tokens |
| Finished cleanly | Yes, with a full summary and a list of doubts | No. It hit the harness's output-token limit during the final re-read, so there is no closing summary. The file was complete. |
| File | 364 lines | 345 lines |
| Checker (79 original checks) | 79/79 | 79/79 |
| Checker (81, after two probes I added) | 80/81 | 80/81 |
| Saved as | branch `task04-27b`, `88ea025` | branch `task04-swift`, `3d6e768` |

Both outputs are kept unchanged on their branches. Main was fast-forwarded to `task04-27b`.

## Result
The checker (`pgcheck/check-security.mjs` in Claude's scratchpad) runs both migrations on PGlite (Postgres 18.6). The setup mimics Supabase:
- `anon` and `authenticated` roles, with Supabase's default "grant everything" privileges, so the policies are the only barrier
- `auth.uid()` that reads the JWT claims
- a `supabase_realtime` publication

It signs in as four users (Alice and Bob as partners, Carol as an outsider with her own household, Dave with no household) and tests:
- the sign-up trigger
- both household functions and all their errors
- invite code rotation
- reads and writes across users on all six tables
- profile tampering
- anon access
- function hygiene
- realtime

It was validated first against my reference file (below) and two deliberately broken copies of it, each of which it caught.

After both runs I added two probes:
1. **Can a user set Swift's bypass flag?** Swift guards `household_id` with a trigger that allows changes only when the setting `app.allow_household_change` is `'true'`. Any role can set a custom setting with `set_config`, so I set it as Dave and tried to move into Carol's household. **Swift's trigger let it through**, and only the update policy's `with check` stopped it. Both files pass this check, but in Swift's file the trigger adds no real protection.
2. **Can users rewrite `created_at`?** Yes in **both** files: the update policy pins `id` and `household_id`, but every other column is open.

Read but not testable on PGlite (single connection, no concurrency):
- **The 27B locks rows** (`for update` on the caller's profile and on the household) before checking membership, so two people joining at once can't both take the second seat.
- **Swift doesn't lock**, so a race could make a household of 3.

### Design comparison
| | 27B | Swift |
|---|---|---|
| Stops `household_id` / `id` changes | `with check` comparing the new row to `my_household()` (definer, so it sees the old value) | The same `with check`, **plus** a trigger with a flag any user can set (not a real second layer) |
| Concurrency in `join_household` | Row locks: race-safe | No locks: possible 3rd member |
| `my_household()` in policies | Bare call (runs once per row) | `(select ...)` wrapped: evaluated once per query |
| Table privileges | Adds grants and revokes `anon` (beyond the brief, harmless) | None |
| Extra objects | None | `new_invite_code()` (executable by anyone, harmless), `protect_profile_fields()` and its trigger |
| Doubts reported | Five, all sensible (needs owner rights on `auth.users`, rare collision on the rotated code, whitespace-only names) | None (cut off) |

## What I changed
I kept the 27B file (race-safe, simpler, no misleading flag) and changed:
- **Wrapped every `public.my_household()` call in policies as `(select public.my_household())`.** Swift got this right. It's the same once-per-query caching the brief asked for with `auth.uid()`, and it matters on the `meal_logs` and `activities` reads.
- **Profiles: column-level update grants.** Revoked insert, update and delete on `profiles` from `authenticated`, then granted `update (display_name, color, goal_*, timezone)`. Now `id`, `household_id` and `created_at` can't be written by a client at all, whatever the policies say. This closes the `created_at` hole, and makes the `household_id` protection a privilege, not only a policy.
- Re-ran the checker after the changes: **81/81**.

## How I would have done it
My reference file (`pgcheck/reference-security.sql`, 111 lines, written before either run) passes 81/81. Compared with the merged file:
- **Column grants as the main guard on `profiles`.** RLS can't say "this column must not change" directly. The 27B's `with check` trick works, but it relies on a subtle snapshot rule (a definer function inside the policy seeing the pre-update value). A column grant is plain and obvious.
- **Revoked insert, update and delete on `households` too**, rather than relying on there being no write policy.
- **Same locking as the 27B** on the household row in `join_household`. I didn't lock the caller's profile; the 27B's extra lock is a small improvement.
- **`handle_new_user()` also trimmed whitespace-only display names**, with a final fallback of `'Me'` if both name and email are empty. Both models only handle `''`.
- **About a third of the length.** The models wrote long header comments, which is fine for a security file but not needed.

## Verdict
**Both models produced a correct, secure migration on their first try.** That's the best result so far for a design task. The 27B is the better engineer (locking, clear reasoning, honest list of doubts), but it's slow at 8.5 tok/s. Swift is twice as fast and caught the `(select ...)` detail, but added a protection that doesn't protect, missed the race, and ran out of output tokens.

**Lessons:**
1. For security-critical SQL, use the 27B. Its hour-long run is acceptable for a one-off migration.
2. Swift is a good second opinion, or a fit for tasks where speed matters more than subtle correctness.
3. Neither model thought about columns other than the two named in the brief (`created_at`). Briefs should say "only these columns may change", not "these two must not".
4. A checker run with the database's real default privileges catches more than reading the SQL does.
