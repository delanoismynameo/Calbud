-- Migration: create core tables (households, profiles, foods, meal_logs, meal_prep, activities) for Supabase Postgres 17.

-- 1. households
create table public.households (
    id uuid primary key default gen_random_uuid(),
    name text,
    invite_code text not null unique default substr(md5(random()::text), 1, 8),
    created_at timestamptz not null default now()
);

-- 2. profiles
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    household_id uuid references public.households(id) on delete set null,
    display_name text not null,
    color text not null default '#6366f1',
    goal_calories int not null default 2000 check (goal_calories > 0),
    goal_protein_g int not null default 150 check (goal_protein_g > 0),
    goal_carbs_g int not null default 250 check (goal_carbs_g > 0),
    goal_fat_g int not null default 65 check (goal_fat_g > 0),
    timezone text not null default 'America/New_York',
    created_at timestamptz not null default now(),
    check (goal_calories > 0 and goal_protein_g > 0 and goal_carbs_g > 0 and goal_fat_g > 0)
);

-- 3. foods
create table public.foods (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    source text not null check (source in ('usda', 'off', 'custom')),
    source_id text,
    name text not null,
    brand text,
    serving_g numeric,
    serving_label text,
    kcal_100g numeric not null,
    protein_100g numeric not null,
    carbs_100g numeric not null,
    fat_100g numeric not null,
    fiber_100g numeric,
    sugar_100g numeric,
    sodium_mg_100g numeric,
    is_favorite boolean not null default false,
    created_at timestamptz not null default now(),
    unique (household_id, source, source_id),
    check (kcal_100g >= 0 and protein_100g >= 0 and carbs_100g >= 0 and fat_100g >= 0),
    check (serving_g is null or serving_g > 0)
);

-- 4. meal_logs
create table public.meal_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    logged_on date not null,
    meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
    food_id uuid references public.foods(id) on delete set null,
    name text not null,
    quantity_g numeric not null check (quantity_g > 0),
    kcal numeric not null,
    protein_g numeric not null,
    carbs_g numeric not null,
    fat_g numeric not null,
    created_at timestamptz not null default now(),
    check (kcal >= 0 and protein_g >= 0 and carbs_g >= 0 and fat_g >= 0)
);

-- 5. meal_prep
create table public.meal_prep (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    created_by uuid references public.profiles(id) on delete set null,
    title text not null,
    recipe_url text,
    scheduled_date date not null,
    start_time time,
    duration_min int not null default 60 check (duration_min > 0),
    status text not null default 'planned' check (status in ('planned', 'done')),
    servings int not null default 1 check (servings > 0),
    ingredients jsonb not null default '[]'::jsonb,
    notes text,
    created_at timestamptz not null default now()
);

-- 6. activities
create table public.activities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    scheduled_date date not null,
    start_time time,
    duration_min int check (duration_min is null or duration_min > 0),
    kcal_burned int check (kcal_burned is null or kcal_burned >= 0),
    completed boolean not null default false,
    notes text,
    created_at timestamptz not null default now()
);

-- Indexes
create index meal_logs_user_id_logged_on_idx on public.meal_logs (user_id, logged_on);
create index meal_prep_household_scheduled_idx on public.meal_prep (household_id, scheduled_date);
create index activities_user_scheduled_idx on public.activities (user_id, scheduled_date);
create index profiles_household_id_idx on public.profiles (household_id);
create index foods_household_id_idx on public.foods (household_id);

-- Row Level Security (no policies yet)
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_prep enable row level security;
alter table public.activities enable row level security;
