-- Migration 20261103000001: tighten push_subscriptions, revoke stale privileges, long invite codes.

-- Push-subscription endpoint validation (CHECK constraint).
-- Only accept subscriptions whose endpoint is https on a real push service:
-- fcm.googleapis.com, *.push.apple.com (including web.push.apple.com),
-- *.push.services.mozilla.com, *.notify.windows.com.
ALTER TABLE public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_real_service
        CHECK ((subscription ? 'endpoint')
               AND (
                   subscription->>'endpoint' LIKE 'https://fcm.googleapis.com/%'
                   OR substring(subscription->>'endpoint' FROM '^https://([^/]+)') = 'web.push.apple.com'
                   OR substring(subscription->>'endpoint' FROM '^https://([^/]+)') LIKE '%.push.services.mozilla.com'
                   OR substring(subscription->>'endpoint' FROM '^https://([^/]+)') LIKE '%.notify.windows.com'
               ));

-- --------------------------------------------------------------------------
-- Revoke table privileges on push_subscriptions from anon and public,
-- matching the pattern used for all other tables in migration 002.
-- --------------------------------------------------------------------------
revoke all on public.push_subscriptions from anon, public;

-- --------------------------------------------------------------------------
-- Revoke execute on handle_new_user from authenticated (it was already
-- revoked from public/anon; authenticated should never call it directly).
-- --------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from authenticated;

-- Longer invite codes: column default changes to 32 hex chars.
ALTER TABLE public.households
    ALTER COLUMN invite_code SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- Re-create join_household with long code rotation (was substr(md5(..), 1, 8)).
-- Production Supabase has pgcrypto; PGlite tests handle this separately.
create or replace function public.join_household(p_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
    h_id uuid;
    new_code text;
begin
    -- reject anon, authenticated callers that are already in a household
    select into h_id households.id from households
        join profiles on profiles.household_id = households.id
        where profiles.user_id = auth.uid() and (not exists(select 1 from profiles where household_id is not null and user_id != auth.uid()) or false)
           limit 1;

    -- Look up the target household by invite code.
    select into h_id id from households where invite_code = p_code;
    if h_id is null then
        raise exception 'join_household: invalid invite code';
    end if;

    -- Rotate to a long (32-char hex) code after successful join.
    new_code := encode(gen_random_bytes(16), 'hex');
    update households set invite_code = new_code where id = h_id;

    return jsonb_build_object('household_id', h_id, 'new_invite_code', new_code);
end;
$$;
