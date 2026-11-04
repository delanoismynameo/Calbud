-- Migration 20261105000000: your own photos.
--
-- 1. A private Storage bucket, household_photos, with one folder per household:
--    <household id>/<random id>.jpg. Only JPEGs (the app shrinks photos to about 1200 px before upload), at most 2 MB.
-- 2. Storage policies: a signed-in person can read, add, replace and delete files only in their own household's folder.
--    The app shows photos through short-lived signed links, so nothing is public.
-- 3. foods.photo_url: the storage path of the household's own photo of a food (a prep dish, a custom food, or any
--    logged food). It is separate from image_url (the Open Food Facts package photo), so a re-scan that refreshes
--    image_url never replaces your photo; the app shows photo_url first.
-- 4. meal_prep.photo_url: an optional photo of the recipe itself (a cookbook page or a handwritten card).
--
-- foods and meal_prep already have table-level grants and household policies, which cover the new columns.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('household_photos', 'household_photos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy household_photos_select
    on storage.objects
    for select to authenticated
    using (bucket_id = 'household_photos'
           and (storage.foldername(name))[1] = (select public.my_household())::text);

create policy household_photos_insert
    on storage.objects
    for insert to authenticated
    with check (bucket_id = 'household_photos'
                and (storage.foldername(name))[1] = (select public.my_household())::text);

create policy household_photos_update
    on storage.objects
    for update to authenticated
    using (bucket_id = 'household_photos'
           and (storage.foldername(name))[1] = (select public.my_household())::text)
    with check (bucket_id = 'household_photos'
                and (storage.foldername(name))[1] = (select public.my_household())::text);

create policy household_photos_delete
    on storage.objects
    for delete to authenticated
    using (bucket_id = 'household_photos'
           and (storage.foldername(name))[1] = (select public.my_household())::text);

alter table public.foods
    add column photo_url text check (photo_url is null or length(photo_url) <= 200);

alter table public.meal_prep
    add column photo_url text check (photo_url is null or length(photo_url) <= 200);
