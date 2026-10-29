-- Migration 20261029000002: more nutrients than calories and macros.
--
-- Why: USDA and Open Food Facts report the Nutrition Facts label set
-- (saturated fat, cholesterol, sodium, vitamin D, iron and so on). They are
-- stored as a jsonb object so the app can add more keys later without a
-- migration. A missing key means "not reported", never zero.
--
-- foods.extra_100g holds amounts per 100 g, keyed like "sodium_mg". The old
-- fiber_100g, sugar_100g and sodium_mg_100g columns stay and are copied in.
-- meal_logs.extra holds the amounts for the logged quantity, snapshotted
-- like kcal and the macros.

alter table public.foods
    add column extra_100g jsonb not null default '{}'::jsonb
    check (jsonb_typeof(extra_100g) = 'object');

update public.foods
set extra_100g = jsonb_strip_nulls(jsonb_build_object(
    'fiber_g', fiber_100g,
    'sugar_g', sugar_100g,
    'sodium_mg', sodium_mg_100g));

alter table public.meal_logs
    add column extra jsonb not null default '{}'::jsonb
    check (jsonb_typeof(extra) = 'object');
