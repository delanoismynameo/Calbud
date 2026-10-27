# 03: Supabase migration, tables only

## Brief

You are working in the folder `C:\Users\orgo1\Documents\Calbud`. Your job is to write **one SQL migration file** that creates the app's database tables for Supabase (Postgres 17). Do **only** what is listed here. Security policies, triggers and functions are a later task.

### Read only these files
- This file. Everything you need is below. Do not read `GAME_PLAN.md` or other files.

### Background
- Two partners share a **household**. Each user has a **profile**, which belongs to a household.
- Supabase already provides the table `auth.users` (column `id uuid`). Do not create it.
- `gen_random_uuid()` is built in; no extension is needed.

### Create this file
`supabase/migrations/20261027000001_tables.sql`

It must create these six tables, in this order, with exactly these columns. Use `create table public.<name>`.

**1. `households`**
- `id uuid primary key default gen_random_uuid()`
- `name text`
- `invite_code text not null unique default substr(md5(random()::text), 1, 8)`
- `created_at timestamptz not null default now()`

**2. `profiles`**
- `id uuid primary key references auth.users(id) on delete cascade`
- `household_id uuid references public.households(id) on delete set null`
- `display_name text not null`
- `color text not null default '#6366f1'`
- `goal_calories int not null default 2000`
- `goal_protein_g int not null default 150`
- `goal_carbs_g int not null default 250`
- `goal_fat_g int not null default 65`
- `timezone text not null default 'America/New_York'`
- `created_at timestamptz not null default now()`
- Check: all four goals are `> 0`.

**3. `foods`** (cached and custom foods; nutrition per 100 g)
- `id uuid primary key default gen_random_uuid()`
- `household_id uuid not null references public.households(id) on delete cascade`
- `source text not null check (source in ('usda', 'off', 'custom'))`
- `source_id text` (USDA fdcId or barcode; null for custom foods)
- `name text not null`
- `brand text`
- `serving_g numeric`
- `serving_label text`
- `kcal_100g numeric not null`, `protein_100g numeric not null`, `carbs_100g numeric not null`, `fat_100g numeric not null`
- `fiber_100g numeric`, `sugar_100g numeric`, `sodium_mg_100g numeric`
- `is_favorite boolean not null default false`
- `created_at timestamptz not null default now()`
- Unique constraint on `(household_id, source, source_id)`.
- Check: the four required nutrition values are `>= 0`, and `serving_g` is null or `> 0`.

**4. `meal_logs`** (nutrition is copied in at log time, so later food edits never change history)
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `logged_on date not null`
- `meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'))`
- `food_id uuid references public.foods(id) on delete set null`
- `name text not null`
- `quantity_g numeric not null check (quantity_g > 0)`
- `kcal numeric not null`, `protein_g numeric not null`, `carbs_g numeric not null`, `fat_g numeric not null`
- `created_at timestamptz not null default now()`
- Check: the four nutrition values are `>= 0`.

**5. `meal_prep`** (shared by the household)
- `id uuid primary key default gen_random_uuid()`
- `household_id uuid not null references public.households(id) on delete cascade`
- `created_by uuid references public.profiles(id) on delete set null`
- `title text not null`
- `recipe_url text`
- `scheduled_date date not null`
- `start_time time`
- `duration_min int not null default 60 check (duration_min > 0)`
- `status text not null default 'planned' check (status in ('planned', 'done'))`
- `servings int not null default 1 check (servings > 0)`
- `ingredients jsonb not null default '[]'::jsonb`
- `notes text`
- `created_at timestamptz not null default now()`

**6. `activities`** (each person's planned workouts and plans)
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `title text not null`
- `scheduled_date date not null`
- `start_time time`
- `duration_min int check (duration_min is null or duration_min > 0)`
- `kcal_burned int check (kcal_burned is null or kcal_burned >= 0)`
- `completed boolean not null default false`
- `notes text`
- `created_at timestamptz not null default now()`

**Indexes** (after the tables):
- `meal_logs (user_id, logged_on)`
- `meal_prep (household_id, scheduled_date)`
- `activities (user_id, scheduled_date)`
- `profiles (household_id)`
- `foods (household_id)`

**Row level security:** at the end of the file, run `alter table public.<name> enable row level security;` for all six tables. Add **no policies**. A later task adds them; until then the tables are locked, which is intended.

### Rules
- Plain SQL only. Start the file with a short comment saying what it creates.
- Do **not** create policies, triggers, functions, views, or any table not listed.
- Do **not** run any git commands.
- Do **not** change any other file.

### Done when
1. The file exists at exactly `supabase/migrations/20261027000001_tables.sql`.
2. Re-read the file once against this brief and confirm every table, column, default, constraint, index and `enable row level security` line is there.

Your SQL will be executed against a real Postgres 17 database afterwards, so it must run without errors from top to bottom. Reply with a short summary: the tables created, the indexes, and anything in this brief you were unsure about.
