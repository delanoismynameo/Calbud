-- Migration 20261104000000: add water tracking table and goal column.
--
-- 1. water_logs: one row per water addition (who, which day, how many fl oz, when).
-- 2. profiles: add water_goal column defaulting to 64 fl oz.

-- Add water_goal column to profiles
alter table public.profiles
    add column goal_water_oz int not null default 64 check (goal_water_oz > 0);

-- Create water_logs table
create table public.water_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    logged_on date not null,
    amount_oz numeric not null check (amount_oz > 0),
    created_at timestamptz not null default now()
);

-- Create index for efficient queries
create index water_logs_user_id_logged_on_idx on public.water_logs (user_id, logged_on);

-- Enable row level security
alter table public.water_logs enable row level security;