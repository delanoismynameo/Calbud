-- Migration 20261028000001: let a solo household member switch households.
--
-- Why: join_household() today refuses anyone who is already in a household,
-- so a partner who created their own household by mistake can never join
-- their partner's household. This replaces the function so that a caller
-- who is the only member of their household can switch to the target:
-- their meal logs re-point to matching foods, their remaining foods and
-- meal_prep rows move over, they join the target, and their now-empty old
-- household is deleted, all in the one function call (one transaction).
-- Everything else the function did is kept: the sign-in check, the locked
-- profile row, the code lookup and locked target row, the full-at-2
-- refusal, and the invite-code rotation after a join.

create or replace function public.join_household(p_code text)
    returns uuid
    language plpgsql
    security definer
    set search_path = ''
as $$
declare
    v_uid uuid;
    v_old_household uuid;
    v_household_id uuid;
    v_lock int;
    v_old_members int;
    v_members int;
begin
    v_uid := (select auth.uid());
    if v_uid is null then
        raise exception 'join_household: you must be signed in';
    end if;

    -- Lock the caller's profile row so the membership read below cannot
    -- change underneath us.
    select household_id
    into v_old_household
    from public.profiles
    where id = v_uid
    for update;

    if not found then
        raise exception 'join_household: no profile row for this user';
    end if;

    -- Look up the target and lock its row before its member count is taken,
    -- so two partners cannot both see one free seat.
    select id
    into v_household_id
    from public.households
    where invite_code = p_code
    for update;

    if v_household_id is null then
        raise exception 'join_household: no household has that invite code';
    end if;

    if v_old_household is not null then
        -- Refuse the no-op: the code belongs to the caller's own household.
        if v_old_household = v_household_id then
            raise exception 'join_household: you are already in that household';
        end if;

        -- Lock the caller's current household row, then take the member
        -- counts while both household rows are locked.
        select 1
        into v_lock
        from public.households
        where id = v_old_household
        for update;

        if not found then
            raise exception 'join_household: your household row is missing';
        end if;

        select count(*)
        into v_old_members
        from public.profiles
        where household_id = v_old_household;

        if v_old_members >= 2 then
            raise exception 'join_household: you are already in a household with someone';
        end if;
    end if;

    select count(*)
    into v_members
    from public.profiles
    where household_id = v_household_id;

    if v_members >= 2 then
        raise exception 'join_household: that household already has 2 members';
    end if;

    if v_old_household is not null then
        -- The caller is alone in their household: move them, and their data,
        -- into the target, then delete the old household.

        -- 1) Re-point the caller's meal logs that reference a food the target
        --    already has (same source and source_id) at the target's copy.
        --    The old copy is deleted with the old household below.
        update public.meal_logs ml
        set food_id = t.target_food
        from (
            select ml2.id as log_id,
                   f2.id as target_food
            from public.meal_logs ml2
            join public.foods oldf
                on oldf.id = ml2.food_id
               and oldf.household_id = v_old_household
            join public.foods f2
                on f2.household_id = v_household_id
               and f2.source = oldf.source
               and f2.source_id = oldf.source_id
            where ml2.user_id = v_uid
        ) t
        where ml.id = t.log_id;

        -- 2) Move the old household's foods that the target does not already
        --    have. A food that has a matching copy in the target is left
        --    behind and is deleted with the old household, which also keeps
        --    the unique (household_id, source, source_id) constraint happy.
        update public.foods
        set household_id = v_household_id
        where household_id = v_old_household
          and not exists (
              select 1
              from public.foods f2
              where f2.household_id = v_household_id
                and f2.source = public.foods.source
                and f2.source_id = public.foods.source_id
          );

        -- 3) Move the old household's meal_prep rows.
        update public.meal_prep
        set household_id = v_household_id
        where household_id = v_old_household;

        -- 4) Put the caller in the target first (profiles.household_id is
        --    on delete set null), then delete the now-empty old household,
        --    which cascades to its remaining (duplicate) foods.
        update public.profiles
        set household_id = v_household_id
        where id = v_uid;

        delete from public.households
        where id = v_old_household;
    else
        -- The caller has no household: exactly as before.
        update public.profiles
        set household_id = v_household_id
        where id = v_uid;
    end if;

    -- Rotate the invite code so it cannot be reused.
    update public.households
    set invite_code = substr(md5(random()::text), 1, 8)
    where id = v_household_id;

    return v_household_id;
end;
$$;

-- Keep the privilege setup (authenticated only) in sync with the security
-- migration, as required for every replace of this function.
revoke execute on function public.join_household(text) from public, anon;
grant execute on function public.join_household(text) to authenticated;

