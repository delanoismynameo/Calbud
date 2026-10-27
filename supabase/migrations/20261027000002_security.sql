-- Migration 20261027000002: security for the two-partner household app.
-- Adds my_household(), the sign-up trigger, create_household(),
-- join_household(), RLS policies for the authenticated role only,
-- function/table privileges, and realtime publication entries.

-- ---------------------------------------------------------------------------
-- 1. public.my_household()
-- Returns the calling user's household_id, or null if they have none.
-- Policies call this instead of querying public.profiles directly, which
-- would recurse inside a profiles policy. Security definer + empty search
-- path means it runs as the function owner (the table owner, so no RLS
-- applies to it) using fully qualified names only.
-- ---------------------------------------------------------------------------
create or replace function public.my_household()
    returns uuid
    language sql
    stable
    security definer
    set search_path = ''
as $$
    select household_id
    from public.profiles
    where id = (select auth.uid())
    limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Profile creation on sign-up.
-- The trigger inserts the matching public.profiles row (id = auth user id).
-- display_name comes from raw_user_meta_data; if it is missing or empty, the
-- part of the email before the @ is used. Everything else stays at the
-- column defaults. on conflict keeps a double-firing trigger from aborting
-- the sign-up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(
            nullif(new.raw_user_meta_data ->> 'display_name', ''),
            split_part(coalesce(new.email, ''), '@', 1)
        )
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. public.create_household(p_name text)
-- Creates a household, puts the caller in it, and returns its id.
-- Raises an error if the caller is not signed in or is already in a
-- household. Security definer + empty search path + fully qualified names.
-- The caller's profile row is locked (for update) so two concurrent calls
-- cannot both pass the "already in a household" check.
-- ---------------------------------------------------------------------------
create or replace function public.create_household(p_name text)
    returns uuid
    language plpgsql
    security definer
    set search_path = ''
as $$
declare
    v_uid uuid;
    v_household_id uuid;
begin
    v_uid := (select auth.uid());
    if v_uid is null then
        raise exception 'create_household: you must be signed in';
    end if;

    select household_id
    into v_household_id
    from public.profiles
    where id = v_uid
    for update;

    if not found then
        raise exception 'create_household: no profile row for this user';
    end if;

    if v_household_id is not null then
        raise exception 'create_household: you are already in a household';
    end if;

    insert into public.households (name)
    values (p_name)
    returning id into v_household_id;

    update public.profiles
    set household_id = v_household_id
    where id = v_uid;

    return v_household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. public.join_household(p_code text)
-- Puts the caller in the household with that invite_code and returns its id.
-- Raises an error if the caller is not signed in, is already in a household,
-- no household has that code, or that household already has 2 members.
-- After a successful join, the household's invite_code is replaced with a new
-- random 8-character code so it cannot be reused.
-- The target household row is locked (for update) before the member count is
-- taken, so two partners cannot both see one free seat.
-- ---------------------------------------------------------------------------
create or replace function public.join_household(p_code text)
    returns uuid
    language plpgsql
    security definer
    set search_path = ''
as $$
declare
    v_uid uuid;
    v_current_household uuid;
    v_household_id uuid;
    v_members int;
begin
    v_uid := (select auth.uid());
    if v_uid is null then
        raise exception 'join_household: you must be signed in';
    end if;

    select household_id
    into v_current_household
    from public.profiles
    where id = v_uid
    for update;

    if not found then
        raise exception 'join_household: no profile row for this user';
    end if;

    if v_current_household is not null then
        raise exception 'join_household: you are already in a household';
    end if;

    select id
    into v_household_id
    from public.households
    where invite_code = p_code
    for update;

    if v_household_id is null then
        raise exception 'join_household: no household has that invite code';
    end if;

    select count(*)
    into v_members
    from public.profiles
    where household_id = v_household_id;

    if v_members >= 2 then
        raise exception 'join_household: that household already has 2 members';
    end if;

    update public.profiles
    set household_id = v_household_id
    where id = v_uid;

    -- Rotate the invite code so it cannot be reused.
    update public.households
    set invite_code = substr(md5(random()::text), 1, 8)
    where id = v_household_id;

    return v_household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Row level security policies (RLS itself was enabled in migration 001).
-- Every policy is scoped to the authenticated role; anon has no policies at
-- all, so with RLS enabled it can neither read nor change anything.
-- Per Supabase guidance, auth.uid() is written as (select auth.uid()) so it
-- is evaluated once per query, not once per row.
--
-- Enforcing "you cannot move your profile into another household" and "you
-- cannot change your profile's id": an UPDATE policy with only a USING
-- clause would be checked against the OLD row (which passes for your own
-- row) and would still let the NEW row carry a different household_id. So
-- the profiles update policy below repeats its condition in a WITH CHECK
-- clause, which Postgres evaluates against the NEW row, comparing
-- household_id with public.my_household(). That function is security
-- definer, so it reads the committed, pre-update household without recursing
-- into this policy, and the new row's household_id must match it (a null
-- household must stay null). The id = (select auth.uid()) check in both
-- clauses also pins the row's id. Legitimate changes go through
-- create_household() and join_household(), which run as security definer
-- (the table owner) and are therefore not subject to RLS.
-- ---------------------------------------------------------------------------

-- households: readable only within your own household. No write policies on
-- this table at all: changes happen only through the two functions above.
create policy households_select_own
    on public.households
    for select to authenticated
    using (id = public.my_household());

-- profiles: read your own profile and the profiles in your household.
create policy profiles_select_own_and_household
    on public.profiles
    for select to authenticated
    using (id = (select auth.uid())
           or household_id = public.my_household());

-- profiles: update your own profile only, with id and household_id kept
-- unchanged (see the explanation above). No insert or delete policies: the
-- trigger creates profiles, and deleting the auth user cascades.
create policy profiles_update_own
    on public.profiles
    for update to authenticated
    using (id = (select auth.uid())
           and public.my_household() is not distinct from household_id)
    with check (id = (select auth.uid())
                and public.my_household() is not distinct from household_id);

-- meal_logs: read your own rows and the rows of your household members.
create policy meal_logs_select_household
    on public.meal_logs
    for select to authenticated
    using (user_id = (select auth.uid())
           or user_id in (select id
                          from public.profiles
                          where household_id = public.my_household()));

-- meal_logs: your own rows only; user_id must be you both before and after.
create policy meal_logs_insert_own
    on public.meal_logs
    for insert to authenticated
    with check (user_id = (select auth.uid()));

create policy meal_logs_update_own
    on public.meal_logs
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy meal_logs_delete_own
    on public.meal_logs
    for delete to authenticated
    using (user_id = (select auth.uid()));

-- activities: same shape as meal_logs (per-user rows; reads shared with the
-- household).
create policy activities_select_household
    on public.activities
    for select to authenticated
    using (user_id = (select auth.uid())
           or user_id in (select id
                          from public.profiles
                          where household_id = public.my_household()));

create policy activities_insert_own
    on public.activities
    for insert to authenticated
    with check (user_id = (select auth.uid()));

create policy activities_update_own
    on public.activities
    for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy activities_delete_own
    on public.activities
    for delete to authenticated
    using (user_id = (select auth.uid()));

-- meal_prep: rows of your household; either partner may change any row, but
-- a row must stay in your household.
create policy meal_prep_select_household
    on public.meal_prep
    for select to authenticated
    using (household_id = public.my_household());

create policy meal_prep_insert_household
    on public.meal_prep
    for insert to authenticated
    with check (household_id = public.my_household());

create policy meal_prep_update_household
    on public.meal_prep
    for update to authenticated
    using (household_id = public.my_household())
    with check (household_id = public.my_household());

create policy meal_prep_delete_household
    on public.meal_prep
    for delete to authenticated
    using (household_id = public.my_household());

-- foods: same shape as meal_prep.
create policy foods_select_household
    on public.foods
    for select to authenticated
    using (household_id = public.my_household());

create policy foods_insert_household
    on public.foods
    for insert to authenticated
    with check (household_id = public.my_household());

create policy foods_update_household
    on public.foods
    for update to authenticated
    using (household_id = public.my_household())
    with check (household_id = public.my_household());

create policy foods_delete_household
    on public.foods
    for delete to authenticated
    using (household_id = public.my_household());

-- ---------------------------------------------------------------------------
-- 6. Privileges
-- Execute on the helper and household functions goes to authenticated only:
-- revoke the default public grant and anon, then grant authenticated.
-- ---------------------------------------------------------------------------
revoke execute on function public.my_household() from public, anon;
grant execute on function public.my_household() to authenticated;

revoke execute on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;

revoke execute on function public.join_household(text) from public, anon;
grant execute on function public.join_household(text) to authenticated;

-- Defensive: the trigger function is not meant to be called directly.
revoke execute on function public.handle_new_user() from public, anon;

-- Table privileges for the client role (RLS still applies on top of these).
grant usage on schema public to authenticated;
grant select on public.households to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.meal_logs to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.meal_prep to authenticated;
grant select, insert, update, delete on public.foods to authenticated;

-- anon must be able to neither read nor change anything (defense in depth;
-- the policies above already deny it everything).
revoke all on public.households, public.profiles, public.meal_logs,
              public.activities, public.meal_prep, public.foods
    from anon, public;

-- ---------------------------------------------------------------------------
-- 7. Realtime
-- Publish the three live household tables.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.meal_prep;
alter publication supabase_realtime add table public.meal_logs;
alter publication supabase_realtime add table public.activities;
