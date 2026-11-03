-- Migration 20261103000001: security fixes from the task 76 review.
--
-- 1. push_subscriptions only accepts an endpoint on a real push service. The
--    meal-reminder scheduler (service role) POSTs to whatever endpoint is
--    saved, and sign-up is open, so any other address would let a stranger
--    aim Supabase's server at it. The scheduler checks the same hosts.
-- 2. push_subscriptions loses Supabase's default anon/public grants, like the
--    other tables. RLS already blocked them.
-- 3. handle_new_user (a trigger) can no longer be called by authenticated.
-- 4. Invite codes are 32 hex characters from gen_random_uuid() (a secure
--    random source, built in, no extension) instead of 8 from md5(random()).
--    join_household is the 20261028000001 version with only the rotation
--    line changed.

alter table public.push_subscriptions
    add constraint push_subscriptions_endpoint_push_service
    check (
        coalesce(substring(subscription ->> 'endpoint' from '^https://([^/:?#]+)/'), '')
        ~ '^(fcm\.googleapis\.com|web\.push\.apple\.com|([a-z0-9-]+\.)+push\.apple\.com|([a-z0-9-]+\.)+push\.services\.mozilla\.com|([a-z0-9-]+\.)+notify\.windows\.com)$'
    );

revoke all on public.push_subscriptions from anon, public;

revoke execute on function public.handle_new_user() from authenticated;

alter table public.households
    alter column invite_code set default replace(gen_random_uuid()::text, '-', '');

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

    select household_id
    into v_old_household
    from public.profiles
    where id = v_uid
    for update;

    if not found then
        raise exception 'join_household: no profile row for this user';
    end if;

    select id
    into v_household_id
    from public.households
    where invite_code = p_code
    for update;

    if v_household_id is null then
        raise exception 'join_household: no household has that invite code';
    end if;

    if v_old_household is not null then
        if v_old_household = v_household_id then
            raise exception 'join_household: you are already in that household';
        end if;

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

        update public.meal_prep
        set household_id = v_household_id
        where household_id = v_old_household;

        update public.profiles
        set household_id = v_household_id
        where id = v_uid;

        delete from public.households
        where id = v_old_household;
    else
        update public.profiles
        set household_id = v_household_id
        where id = v_uid;
    end if;

    update public.households
    set invite_code = replace(gen_random_uuid()::text, '-', '')
    where id = v_household_id;

    return v_household_id;
end;
$$;

revoke execute on function public.join_household(text) from public, anon;
grant execute on function public.join_household(text) to authenticated;
