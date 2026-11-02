-- Migration 20261101000000: add image_url and unit columns to foods table.
--
-- Why: a saved food (source 'custom') keeps its unit ('g' or 'ml') and photo link
-- from Open Food Facts, so it displays correctly when logged in meal logs.
--
-- image_url: front-of-package photo from Open Food Facts (nullable, null by default).
-- unit: measurement unit, 'g' for weight or 'ml' for volume (default 'g').
--
-- These columns are only sent by saved barcode foods, so existing foods don't
-- depend on the migration being applied first.

alter table public.foods
    add column image_url text,
    add column unit text check (unit is null or unit in ('g', 'ml')) default 'g';