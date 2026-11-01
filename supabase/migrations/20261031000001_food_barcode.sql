-- Migration 20261031000001: a household's corrected food can carry the barcode it was scanned from.
-- 
-- Why: Open Food Facts is sometimes wrong, and logging a food from it overwrites the saved copy on the next log. A corrected food is therefore saved as its own custom food with the barcode, so scanning that barcode finds the household's version first.
-- 
-- foods.barcode is only set on custom foods and holds 6 to 14 digits. One barcode per household: the unique index ignores foods without a barcode. The existing foods policies already cover the new column, so none are added.

alter table public.foods
    add column barcode text
    check (barcode is null or (source = 'custom' and barcode ~ '^[0-9]{6,14}$'));

create unique index foods_household_barcode_key
    on public.foods (household_id, barcode)
    where barcode is not null;
