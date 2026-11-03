-- Migration 20261104000001: RLS policies for water_logs table and update profiles grant.
-- Similar to meal_logs and activities: insert/change/delete only your own rows;
-- partners in your household can read them.

-- water_logs: read your own rows and the rows of your household members.
create policy water_logs_select_household
    on public.water_logs
    for select to authenticated
    using (user_id = (select auth.uid())
           or user_id in (select id
                           from public.profiles
                           where household_id = (select public.my_household())));

-- water_logs: your own rows only; user_id must be you both before and after.
create policy water_logs_insert_own
    on public.water_logs
    for insert to authenticated
    with check (user_id = (select auth.uid()));

create policy water_logs_update_own
    on public.water_logs
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy water_logs_delete_own
    on public.water_logs
    for delete to authenticated
    using (user_id = (select auth.uid()));

-- Grant table privileges for the client role (RLS still applies on top of these).
grant select, insert, update, delete on public.water_logs to authenticated;

-- Grant update on goal_water_oz for profiles (water goal is editable by the user).
grant update (goal_water_oz) on public.profiles to authenticated;

-- Publish water_logs to realtime for live updates.
alter publication supabase_realtime add table public.water_logs;