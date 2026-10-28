-- Moves YOUR partner into YOUR household and deletes the household she created alone.
-- Edit the two email addresses, then run the whole thing once in the Supabase SQL Editor.
do $$
declare
  my_email  text := 'YOUR_EMAIL@example.com';
  her_email text := 'HER_EMAIL@example.com';
  v_mine uuid;
  v_her uuid;
  v_her_old uuid;
begin
  select p.household_id into v_mine
    from public.profiles p join auth.users u on u.id = p.id
   where lower(u.email) = lower(my_email);
  select p.id, p.household_id into v_her, v_her_old
    from public.profiles p join auth.users u on u.id = p.id
   where lower(u.email) = lower(her_email);

  if v_mine is null then raise exception 'No household found for %', my_email; end if;
  if v_her is null then raise exception 'No account found for %', her_email; end if;
  if v_her_old = v_mine then raise exception 'You are already in the same household'; end if;
  if (select count(*) from public.profiles where household_id = v_mine) >= 2 then
    raise exception 'Your household already has 2 members';
  end if;
  if v_her_old is not null and (select count(*) from public.profiles where household_id = v_her_old) > 1 then
    raise exception 'Her household has other members; not changing it';
  end if;

  update public.profiles set household_id = v_mine where id = v_her;
  if v_her_old is not null then
    delete from public.households where id = v_her_old;
  end if;
  -- New invite code, so the old one can't be reused.
  update public.households set invite_code = substr(md5(random()::text), 1, 8) where id = v_mine;
  raise notice 'Done: % joined your household', her_email;
end $$;
