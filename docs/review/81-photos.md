# 81: Your own photos

## Prompt
A short plain prompt with these parts:
- **The dish photo:** a photo of a finished prep dish becomes the dish food's photo, so it shows on Today and in Prep > Recipes.
- **The recipe photo:** an optional photo of the recipe itself, shown as a thumbnail by the recipe link that opens full screen.
- **Custom foods:** a photo row on custom foods.
- **Today:** add, change or remove any logged food's photo from its edit sheet. The photo is saved on the food. Re-logging or re-scanning must not overwrite it.
- **Uploads:** the photo comes from the camera or the library and is shrunk on the phone to about 1200 px JPEG. Change or Remove deletes the old file.
- **Storage:** a private household-only Storage bucket, with short-lived signed links. Open Food Facts photos keep working.
- **Add food:** your photos show in Add food, and a USDA result that matches a saved food with a photo uses that photo.
- **Database:** a migration with storage policies, plus DB tests if the storage part can be tested.
- **Also:** photo uploads in the mock, unit tests, and tsc, vitest and test-db. Branch `task81-photos`.

## Run
Laguna XS 2.1 at **High**, web UI, Full access, two turns:
- **Turn 1:** 29 min 29 s, 205 steps, ~49 tok/s, 15.2M tokens. Commit a28200f.
- **Turn 2:** a follow-up listing what was missing. 6 min 38 s, 36 steps, 2.9M tokens. Commit cbcf13c.

Its reports (tsc clean, 653 tests, 76 DB tests) were true, but both claimed the screens were out of scope:
- **Turn 1** said they "would be deferred in the original context".
- **Turn 2** said they "go beyond the backend/API work that was requested".

Both claims were false. The screens were items 1 to 4 of the prompt.

## What was wrong
- **It deleted the user's files.** In turn 1 it ran `rm -rf scan-photos/` on the untracked folder of the user's phone screenshots, then `Remove-Item -Recurse -Force`, calling it a "temporary" directory.
  - **Recovery:** I restored all 4 photos from the harness's own copies in `deepseek-harness\home\attachments\v1\objects\`. They are byte-identical, saved when earlier models viewed them.
  - **Guard rail:** prompts now say not to delete files the model didn't create, and untracked files get backed up before a run.
- **No screens at all.** Nothing could add a photo.
- **The migration didn't run:**
  - `create storage bucket … with public = false` (turn 1) and `select supabase.storage.create_bucket(...)` (turn 2) are both invented.
  - The policies were on `objects`, not `storage.objects`, and used their own subquery instead of `my_household()`.
- **The database tests didn't load the migration.** Turn 1 added the columns by hand. Turn 2 pulled out just the `alter table` lines. The policies were never run.
- **Signing happened in the log fetch.** `fetchMealLogs` signed a link for every log, valid for 60 s and then 300 s, so a page left open showed broken images. Nothing else could sign a link.
- **Smaller issues:**
  - Paths were `<household>/<food id>.<ext>` with `upsert: true`, so a changed photo kept the same address and a stale cached copy could show.
  - The mock threw uploads away and returned `{}` for downloads.
  - `extractStoragePath`, `isOfflinePhoto` and `getDisplayPhotoUrl` were unused.
  - The shrink function never revoked its object URL.

## What I changed
- **Migration:**
  - The bucket is now a plain `insert into storage.buckets`: private, JPEG only, 2 MB limit.
  - There are 4 policies on `storage.objects`. Each checks that `(storage.foldername(name))[1]` is `my_household()`.
  - The `photo_url` columns get a length check.
- **Database tests:**
  - A small `storage` schema stub (buckets, objects with row security, `foldername`) lets the real migration run in PGlite.
  - 11 tests: the partner can read and delete; another household, someone with no household and anon cannot; no uploads outside a household folder.
  - Mutation-checked: removing the household check from the select policy fails 2 of them.
- **`storage.ts` (rewritten):**
  - A new random path for each upload, and an `isPhotoPath` check.
  - It shrinks to 1200 px on the long side and is tested on portrait and landscape.
  - Signed links last 1 hour.
  - `deletePhotoIfUnused` deletes a file only when no food or prep session still uses it, since Repeat last week copies a recipe photo.
  - `setFoodPhoto` sets the photo for Today's editor.
- **`usePhotoUrl`:** a query that signs the link and refreshes it before the hour is up. `FoodImage` takes `photoPath` first, then `imageUrl`, with a fallback, so Today keeps the meal icon while a link loads.
- **New components:**
  - `PhotoField` uploads when a photo is picked, then offers Change and Remove, and tapping the thumbnail opens it full screen.
  - `PhotoViewer` shows a photo full screen and closes on a tap, ✕ or Escape.
- **Today's editor:** the photo is saved on the food straight away. Every food list is refreshed, and the new upload is deleted if saving fails.
- **Custom foods:** a photo row. An unsaved photo is deleted on Cancel.
- **Prep form:**
  - A **Dish photo**, saved on the dish food. Saving shows an error if there's no nutrition to save it with.
  - A **Recipe photo** beside the recipe link.
  - The old files are deleted after Save. Cancel drops new uploads. Deleting a session deletes its recipe photo unless another session still uses it.
- **Recipes:** cards show the dish photo, and the recipe photo opens full screen. `recipesFrom` uses the newest session's photos and fills gaps from older ones (tested). Repeat keeps the recipe photo (tested).
- **Never overwritten:** `foodRow` sends `photo_url` only when the caller set it, so a re-log never clears it. `photo_url` is a separate column from `image_url`, so a re-scan that refreshes the package photo never replaces yours.
- **Add food:** `withSavedPhotos` gives a USDA result the photo of the same saved food (tested).
- **Mock:**
  - It stores uploads, taking the file out of supabase-js's multipart form, and serves signed links.
  - It handles remove, `HEAD` counts and `PATCH foods`, and `__state` lists the photos.

## Mock click-through
Phone size, with generated test images.
- **Today, oatmeal editor:**
  - A 4032×3024 PNG was stored as a 1200×900 JPEG of 13 KB. The row showed it in place of the 🍳 tile.
  - Change uploaded a new file and deleted the old one.
  - Remove deleted the file and brought the icon back.
- **Add food:** the photo showed under Recent and under Your foods when searching "oatmeal".
- **Custom food:** "Mom's granola" was saved with a photo, which showed on its serving screen and on Today after logging.
- **Prep, editing Curry:**
  - The dish photo and recipe photo were both saved.
  - Recipes showed the dish photo on the card. The recipe photo opened full screen, a portrait photo 900×1200 shown upright.
  - Logging Curry put its photo on Today.
- **New "Soup" session, photo but no nutrition:** Save showed the error, and Cancel deleted the upload. 4 files before, 5 during, 4 after.

## Verdict
**FAIL for Laguna:**
- No screens in two turns, twice with false claims about the prompt.
- An invented SQL statement twice.
- It deleted the user's files.

The storage helpers, the shrink and the display code went in the right places and were partly kept. The screens and the migration are mine.

Checks: tsc clean, 658 tests, 87 DB tests, build clean. **The migration is not applied to the live database yet.** The storage policies need checking there.
