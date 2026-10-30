-- Migration 20261030000001: a shared grocery list.
--
-- Why: the grocery list is worked out from the week's planned prep sessions,
-- which both partners see. Items added by hand and the ticks next to items
-- were kept in each phone's browser, so the two phones disagreed. These two
-- tables put them in the household's shared data.
--
-- grocery_extras: items added by hand (or from a recipe) for one week. week_start
-- is the Sunday the week starts. key is the item's merge key (lower-cased name,
-- unit, and whether it has a quantity), so adding the same thing again changes
-- the existing row instead of making a second one.
--
-- grocery_ticks: one row means "this item is ticked" for that week. The key is the
-- same merge key and works for both planned and hand-added items. Unticking
-- deletes the row.
--
-- Both are shared like meal_prep: either partner reads and changes any of the
-- household's rows. When a solo member switches households, the old rows go
-- with the old household (on delete cascade).

create table public.grocery_extras (
    household_id uuid not null references public.households(id) on delete cascade,
    week_start date not null,
    key text not null check (length(btrim(key)) between 1 and 300),
    name text not null check (length(btrim(name)) between 1 and 200),
    qty numeric check (qty is null or qty > 0),
    unit text not null default '' check (length(unit) <= 40),
    created_at timestamptz not null default now(),
    primary key (household_id, week_start, key)
);

create table public.grocery_ticks (
    household_id uuid not null references public.households(id) on delete cascade,
    week_start date not null,
    key text not null check (length(btrim(key)) between 1 and 300),
    primary key (household_id, week_start, key)
);

-- The primary keys' indexes (household_id, week_start, ...) serve the week queries.

alter table public.grocery_extras enable row level security;
alter table public.grocery_ticks enable row level security;

create policy grocery_extras_select_household
    on public.grocery_extras
    for select to authenticated
    using (household_id = (select public.my_household()));

create policy grocery_extras_insert_household
    on public.grocery_extras
    for insert to authenticated
    with check (household_id = (select public.my_household()));

create policy grocery_extras_update_household
    on public.grocery_extras
    for update to authenticated
    using (household_id = (select public.my_household()))
    with check (household_id = (select public.my_household()));

create policy grocery_extras_delete_household
    on public.grocery_extras
    for delete to authenticated
    using (household_id = (select public.my_household()));

create policy grocery_ticks_select_household
    on public.grocery_ticks
    for select to authenticated
    using (household_id = (select public.my_household()));

create policy grocery_ticks_insert_household
    on public.grocery_ticks
    for insert to authenticated
    with check (household_id = (select public.my_household()));

create policy grocery_ticks_delete_household
    on public.grocery_ticks
    for delete to authenticated
    using (household_id = (select public.my_household()));

grant select, insert, update, delete on public.grocery_extras to authenticated;
grant select, insert, delete on public.grocery_ticks to authenticated;
revoke all on public.grocery_extras from anon, public;
revoke all on public.grocery_ticks from anon, public;

alter publication supabase_realtime add table public.grocery_extras;
alter publication supabase_realtime add table public.grocery_ticks;
