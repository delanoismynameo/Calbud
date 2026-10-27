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
