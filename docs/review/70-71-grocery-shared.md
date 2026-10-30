# 70-71: Shared grocery list

Briefs `70-grocery-shared-data.md` (data layer) and `71-grocery-shared-screens.md` (screens). Migration `supabase/migrations/20261030000001_grocery.sql` (tables `grocery_extras` and `grocery_ticks`, shared by household, realtime on). Branch `redesign`.

## Result
- Hand-added items and ticks now live in the database, so both partners see the same list; the browser-storage code is gone. 457 tests, type check and build pass.
- Checked on the mock at 375 px: tick, add, reload (state comes back from the server, nothing in `localStorage`), Clear ticks and remove, and the mock's `/__state` shows the rows.

## What I changed after the model
- 70: adding extras read the query cache, which is empty when called from the Recipes tab, so it could overwrite quantities instead of adding. It now reads the table first.
- 71: the "Send to Keep" dialog still said ticks were "on this phone".
- I wrote the migration and the mock tables myself, before the runs.

## Before this is pushed
**The migration must be applied to the real database first** (SQL Editor), or the grocery list errors for everyone. Not run: nothing here has touched the real Supabase, so row-level security, the upsert and realtime are untested against the real thing.
Old per-phone items and ticks are not carried over; they simply stop showing.
