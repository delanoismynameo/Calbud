-- Migration 20261102000002: add push_subscriptions table for web push notifications.
--
-- Why: users can opt-in to receive push notifications for meal reminders
-- when the app is closed or the phone is locked.
--
-- Columns:
-- user_id: references profiles.id (the user receiving notifications)
-- subscription: the push subscription object for Web Push API
-- created_at: when the subscription was created

create table public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    subscription jsonb not null,
    created_at timestamptz not null default now()
);

-- Ensure one subscription per user
create unique index push_subscriptions_user_id_unique on public.push_subscriptions (user_id);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Select policy: users can read their own subscription
create policy push_subscriptions_select_own
    on public.push_subscriptions
    for select to authenticated
    using (user_id = (select auth.uid()));

-- Insert policy: users can insert their own subscription
create policy push_subscriptions_insert_own
    on public.push_subscriptions
    for insert to authenticated
    with check (user_id = (select auth.uid()));

-- Update policy: users can update their own subscription
create policy push_subscriptions_update_own
    on public.push_subscriptions
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

-- Delete policy: users can delete their own subscription
create policy push_subscriptions_delete_own
    on public.push_subscriptions
    for delete to authenticated
    using (user_id = (select auth.uid()));

-- Grant privileges
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;