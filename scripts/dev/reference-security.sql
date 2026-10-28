-- Claude's reference version of task 04, used to validate the checker and for the review comparison.

-- 1. Caller's household, readable inside policies without recursing through profiles RLS.
create function public.my_household() returns uuid
language sql stable security definer set search_path = ''
as $$ select household_id from public.profiles where id = (select auth.uid()) $$;

-- 2. Profile on sign-up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), nullif(split_part(new.email, '@', 1), ''), 'Me')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Create a household and join it.
create function public.create_household(p_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.profiles where id = v_uid and household_id is not null) then
    raise exception 'already in a household';
  end if;
  insert into public.households (name) values (p_name) returning id into v_id;
  update public.profiles set household_id = v_id where id = v_uid;
  return v_id;
end $$;

-- 4. Join by invite code; max 2 members; rotate the code after use.
create function public.join_household(p_code text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.profiles where id = v_uid and household_id is not null) then
    raise exception 'already in a household';
  end if;
  -- Lock the household row so two people can't join at once and make it 3.
  select id into v_id from public.households where invite_code = p_code for update;
  if v_id is null then raise exception 'invalid invite code'; end if;
  if (select count(*) from public.profiles where household_id = v_id) >= 2 then
    raise exception 'household is full';
  end if;
  update public.profiles set household_id = v_id where id = v_uid;
  update public.households set invite_code = substr(md5(random()::text), 1, 8) where id = v_id;
  return v_id;
end $$;

-- 6. Execute privileges: Supabase grants functions to anon by default, so revoke explicitly.
revoke execute on function public.my_household(), public.create_household(text), public.join_household(text) from public, anon;
grant execute on function public.my_household(), public.create_household(text), public.join_household(text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 5. Table privileges + policies.
-- Supabase's default grants give API roles full table access, so column privileges do the work
-- RLS can't: users may update only these profile columns (never id or household_id).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, color, goal_calories, goal_protein_g, goal_carbs_g, goal_fat_g, timezone) on public.profiles to authenticated;
revoke insert, update, delete on public.households from anon, authenticated;

create policy "read own household" on public.households for select to authenticated
  using (id = (select public.my_household()));

create policy "read self and partner" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or household_id = (select public.my_household()));
create policy "update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "read own and partner logs" on public.meal_logs for select to authenticated
  using (user_id = (select auth.uid())
    or user_id in (select p.id from public.profiles p where p.household_id = (select public.my_household())));
create policy "insert own logs" on public.meal_logs for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "update own logs" on public.meal_logs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own logs" on public.meal_logs for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "read own and partner activities" on public.activities for select to authenticated
  using (user_id = (select auth.uid())
    or user_id in (select p.id from public.profiles p where p.household_id = (select public.my_household())));
create policy "insert own activities" on public.activities for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "update own activities" on public.activities for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own activities" on public.activities for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "household meal prep" on public.meal_prep for all to authenticated
  using (household_id = (select public.my_household())) with check (household_id = (select public.my_household()));
create policy "household foods" on public.foods for all to authenticated
  using (household_id = (select public.my_household())) with check (household_id = (select public.my_household()));

-- 7. Realtime.
alter publication supabase_realtime add table public.meal_prep, public.meal_logs, public.activities;
