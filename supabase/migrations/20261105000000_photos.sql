-- Migration 20261105000000: photo storage bucket and photo URL columns.
--
-- Why: users want to add their own photos for dishes, recipes, and custom foods.
-- Photos are stored in a private Supabase Storage bucket with one folder per household,
-- and accessed via short-lived signed URLs.
--
-- photo_url on foods: stored by custom foods (dish foods, saved barcode foods) and their users.
-- photo_url on meal_prep: optional photo of the recipe itself (cookbook page, handwritten card).

-- Create the storage bucket for household photos (one folder per household)
-- Uses the storage.create_bucket RPC function to create the bucket
select supabase.storage.create_bucket('household_photos', false);

-- Storage policies for the household_photos bucket
-- Only authenticated users can work with the bucket, and only within their household's folder.
-- The bucket is organized as: household_id/file_path

-- Allow users to create (upload) files only within their household's folder.
create policy household_photos_insert on objects for insert to authenticated
  with check (bucket_id = 'household_photos' and (split_part(name, '/', 1))::uuid = (select household_id from profiles where id = auth.uid()));

-- Allow users to read files only within their household's folder.
create policy household_photos_select on objects for select to authenticated
  using (bucket_id = 'household_photos' and (split_part(name, '/', 1))::uuid = (select household_id from profiles where id = auth.uid()));

-- Allow users to update (replace) files only within their household's folder.
create policy household_photos_update on objects for update to authenticated
  using (bucket_id = 'household_photos' and (split_part(name, '/', 1))::uuid = (select household_id from profiles where id = auth.uid()));

-- Allow users to delete files only within their household's folder.
create policy household_photos_delete on objects for delete to authenticated
  using (bucket_id = 'household_photos' and (split_part(name, '/', 1))::uuid = (select household_id from profiles where id = auth.uid()));

-- Add photo_url columns to foods and meal_prep tables.
-- photo_url on foods: stored locally by the household's custom foods (dish foods, saved foods).
-- photo_url on meal_prep: optional recipe photo shown by the recipe link.
alter table public.foods
  add column photo_url text;

alter table public.meal_prep
  add column photo_url text;