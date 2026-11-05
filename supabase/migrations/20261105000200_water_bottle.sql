-- Migration 20261105000200: add profiles.bottle_oz for the user's water bottle size.
-- One-time choice, so it lives on the profile (like goal_water_oz), not in the browser.
-- Default 18 oz matches the user's bottle.

alter table public.profiles
    add column bottle_oz int not null default 18 check (bottle_oz between 1 and 500);

-- Grant update on bottle_oz for profiles (user's bottle size is editable by the user).
grant update (bottle_oz) on public.profiles to authenticated;
