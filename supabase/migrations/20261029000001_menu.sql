-- Migration 20261029000001: the household's weekly menu.
--
-- Why: the Prep page plans when food is cooked; the menu says what is eaten
-- at each meal. One row is one filled slot: a day plus breakfast, lunch or
-- dinner. An empty slot has no row, so clearing a slot deletes its row.
--
-- label is always set (free text such as "OYO", or a dish's name). prep_id
-- optionally links the slot to the prep session that cooks it, so a batch
-- can fill several slots. Deleting the session keeps the slot and its label
-- and clears the link.
--
-- The menu is shared: like meal_prep, either partner reads and changes any
-- of the household's rows. When a solo member switches households, their
-- old menu is deleted with the old household (on delete cascade).

create table public.menu_slots (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    slot_date date not null,
    meal text not null check (meal in ('breakfast', 'lunch', 'dinner')),
    label text not null check (length(btrim(label)) between 1 and 200),
    prep_id uuid references public.meal_prep(id) on delete set null,
    unique (household_id, slot_date, meal)
);

-- The unique constraint's index (household_id, slot_date, meal) serves the week query.

alter table public.menu_slots enable row level security;

create policy menu_slots_select_household
    on public.menu_slots
    for select to authenticated
    using (household_id = (select public.my_household()));

create policy menu_slots_insert_household
    on public.menu_slots
    for insert to authenticated
    with check (household_id = (select public.my_household()));

create policy menu_slots_update_household
    on public.menu_slots
    for update to authenticated
    using (household_id = (select public.my_household()))
    with check (household_id = (select public.my_household()));

create policy menu_slots_delete_household
    on public.menu_slots
    for delete to authenticated
    using (household_id = (select public.my_household()));

grant select, insert, update, delete on public.menu_slots to authenticated;
revoke all on public.menu_slots from anon, public;

alter publication supabase_realtime add table public.menu_slots;
