# Game Plan: Calbud — Couple's Calorie, Meal Prep & Exercise Planner

## Overview

An installable web app (PWA) for two people to:

- **Log calories and macros**, with food lookup from a free nutrition database instead of manual entry
- **View and edit a shared meal prep plan**
- **Plan workouts and activities** for the week
- **Export the week to Google Calendar** (`.ics` file)
- **See each other's data** (logs, plans, progress)

Hosted on **GitHub Pages** (static), backed by **Supabase** free tier. Target cost: $0.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React + TypeScript + Vite | Static build, deploys cleanly to Pages |
| Styling | Tailwind CSS | Mobile-first |
| PWA | `vite-plugin-pwa` | Manifest + service worker |
| Routing | React Router with **HashRouter** | Avoids GitHub Pages 404-on-refresh. Requires Supabase Auth in **PKCE** mode (see Auth) |
| Data fetching | TanStack Query + `supabase-js` | Caching, optimistic updates, retry |
| Backend / DB / Auth | Supabase (free) | Postgres, Auth, Realtime |
| Food data | **USDA FoodData Central** + **Open Food Facts** | Both free (see below) |
| Calendar export | `.ics` generation (`ics` npm package or hand-rolled) | No Google OAuth needed |
| Charts | Recharts or Chart.js | Macro rings, weekly bars |
| Hosting | GitHub Pages + GitHub Actions | Auto-deploy on push to `main` |

---

## Food Lookup (the "don't make me type macros" requirement)

Two free sources, each good at something different:

| Source | Best for | Key? | Notes |
|--------|----------|------|-------|
| **USDA FoodData Central** | Generic/whole foods ("chicken breast", "banana", "white rice cooked"), branded foods too | Free API key (api.data.gov) | Generous limits (documented around 1,000 requests/hour per key). CORS-friendly. |
| **Open Food Facts** | Packaged foods, **barcode scan** | No key | Community data, quality varies. Send a descriptive `User-Agent`/app name. Search endpoint has stricter rate limits than product lookup, so debounce typing. |

> Previously considered Nutritionix/Edamam. Free tiers for those have been removed or heavily cut, so don't build on them. Re-verify current limits of any API before committing to it.

**Trade-off to accept:** these APIs do search → pick → choose serving. They do **not** parse sentences like "two eggs and toast" (that was Nutritionix's paid feature). The UX is instead built around speed:

1. Search box with debounced results from USDA (and OFF), merged and de-duplicated.
2. **Barcode scanner** (camera, via `BarcodeDetector` API with a `zxing`/`html5-qrcode` fallback) → Open Food Facts lookup.
3. **Recents and Favorites** shown first, so most daily logging is 2 taps and no API call.
4. **Custom foods / simple recipes** the couple saves once (e.g. "Sunday chili, 1 bowl") and reuses.
5. Serving picker: grams, plus any household measure the API provides. Macros scale from per-100g values.

**USDA parsing gotchas** (handle in `usda.ts`, with tests against saved sample responses):
- Calories are not always nutrient `1008` (Energy, kcal). Some Foundation foods only report Atwater energy (`2047` / `2048`). Fall back in that order, and hide results with no energy value.
- Branded foods report nutrients per 100 g but also carry `labelNutrients` per label serving. Use `servingSize` + `servingSizeUnit` for the default serving.
- Prefer the `Foundation`, `SR Legacy` and `Survey (FNDDS)` data types for generic searches. Branded results flood generic queries like "banana".

**Caching:** every food the couple picks is copied into a `foods` table in Supabase. After a few weeks most lookups hit our own DB, which is faster and makes the app resilient to API outages and limits.

**API key handling:** the USDA key is low-risk (free, rate-limited, read-only data) and can live in the client build as an env var. If we want it hidden anyway, a small Supabase Edge Function proxy is optional. Not needed for v1.

---

## Data Model (Supabase / Postgres)

The key design decision: a **household** groups the two users. Shared data is readable by household members; personal data is writable only by its owner.

```sql
create table households (
  id uuid primary key default gen_random_uuid(),
  name text,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text not null,
  color text default '#6366f1',            -- used to tell you apart in shared views
  goal_calories int default 2000,
  goal_protein_g int default 150,
  goal_carbs_g int default 250,
  goal_fat_g int default 65,
  timezone text default 'America/New_York',
  created_at timestamptz default now()
);

-- Cached/custom foods. Nutrition stored per 100 g (or per serving for custom items).
create table foods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  source text check (source in ('usda','off','custom')),
  source_id text,                           -- fdcId or barcode
  name text not null,
  brand text,
  serving_g numeric,                        -- default serving size in grams
  serving_label text,                       -- "1 cup", "1 slice"
  kcal_100g numeric, protein_100g numeric, carbs_100g numeric, fat_100g numeric,
  fiber_100g numeric, sugar_100g numeric, sodium_mg_100g numeric,
  is_favorite boolean default false,
  unique (household_id, source, source_id)
);

-- A log entry. Nutrition is SNAPSHOTTED so editing/removing a food later never rewrites history.
create table meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  logged_on date not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_id uuid references foods(id) on delete set null,
  name text not null,
  quantity_g numeric not null,
  kcal numeric not null, protein_g numeric not null, carbs_g numeric not null, fat_g numeric not null,
  created_at timestamptz default now()
);
create index on meal_logs (user_id, logged_on);

-- Shared meal prep plan: belongs to the household, not one person.
create table meal_prep (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid references profiles(id),
  title text not null,
  recipe_url text,
  scheduled_date date not null,
  start_time time,                          -- optional, needed for calendar export
  duration_min int default 60,
  status text default 'planned' check (status in ('planned','done')),
  servings int default 1,
  ingredients jsonb default '[]',           -- [{name, qty, unit}]
  notes text
);

-- Planned or completed activities. Owned by a person, visible to the household.
create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,                      -- "Run", "Leg day", "Date night hike"
  scheduled_date date not null,
  start_time time,
  duration_min int,
  kcal_burned int,                          -- manual, optional
  completed boolean default false,
  notes text
);
```

### Row Level Security (explicit, not hand-waved)

Use a `security definer` helper to avoid recursive-policy problems:

```sql
create function my_household() returns uuid
language sql stable security definer set search_path = public
as $$ select household_id from profiles where id = auth.uid() $$;
```

| Table | SELECT | INSERT / UPDATE / DELETE |
|-------|--------|--------------------------|
| `profiles` | own row **or** same `household_id` | own row only |
| `meal_logs` | own rows **or** rows whose user is in my household | own rows only |
| `activities` | same as `meal_logs` | own rows only |
| `meal_prep` | `household_id = my_household()` | `household_id = my_household()` (either partner can edit) |
| `foods` | `household_id = my_household()` | same |
| `households` | my household only | creation via RPC |

**Profile creation:** a trigger on `auth.users` insert creates the `profiles` row (taking `display_name` from the sign-up metadata), so the app never has a signed-in user without a profile.

**Household functions** (both `security definer`, called via `supabase.rpc`):
- `create_household(name text)` creates the household and sets the caller's `household_id`.
- `join_household(code text)` looks up the invite code and sets the caller's `household_id`. Cap membership at 2, and rotate the code after a successful join.
- Every user ends up in a household (solo until the partner joins), so `household_id` checks never deal with "no household" except during onboarding.

**Realtime:** `postgres_changes` subscriptions respect RLS, but each table must be added to the `supabase_realtime` publication (`meal_prep`, `meal_logs`, `activities`).

> Write RLS tests before building UI. A leaky policy is the main security risk in this app. Note that SQL run from the dashboard or `execute_sql` runs as a superuser and **bypasses RLS**, so tests must switch role first (`set local role authenticated; set local request.jwt.claims = '{"sub":"<user-uuid>"}';` inside a transaction), or use pgTAP via `supabase test db`.

---

## Features

### 1. Auth & Household Setup
- Supabase Auth, email + password.
- Create the client with `auth: { flowType: 'pkce' }`. The default implicit flow returns tokens in the URL `#hash`, which collides with HashRouter. PKCE returns a `?code=` query parameter instead.
- Supabase's built-in email sender is heavily rate-limited (a few emails per hour). For two users either turn off "Confirm email" or plug in a free SMTP provider (e.g. Resend) before relying on password-reset emails.
- First-run wizard: name, color, calorie/macro goals. Person A creates the household and gets an invite code. Person B signs up and enters it.

### 2. Meal Logging
- Day view with meal sections, running totals vs. goals (calories + macro bars).
- `logged_on` is the **user's local date**, computed on the client (not `now()::date` on the server, which is UTC and would put late-evening snacks on tomorrow).
- Add flow: Recents/Favorites → Search → Barcode → Custom. Pick serving, confirm, saved with nutrition snapshot.
- Copy yesterday / copy a meal to another day.
- Edit quantity or delete any entry.

### 3. Meal Prep Planner
- Week view (Kanban by day or simple list) of shared prep sessions.
- Each item: title, recipe URL, ingredients, servings, optional time/duration.
- Status `planned → done`. Marking done offers "log servings to my day" (and optionally the partner's).
- Aggregated **grocery list** from the week's ingredients (nice cheap win).
- Supabase Realtime subscription so both phones update live.

### 4. Activity Planner
- Weekly grid for each person; toggle to overlay both.
- Add planned workouts/activities with time and duration; tick off when done; optional calories burned.
- Burned calories are informational only and never change the daily calorie goal.

### 5. Export Week to Google Calendar
- "Export week" button chooses range (default: current/next week) and what to include: my activities, partner's, meal prep.
- Generates a single `.ics` with a stable `UID` per item. Apple Calendar uses this to update events on re-import, but **Google Calendar import does not reliably update or de-duplicate** changed events. Recommend importing into a dedicated "Calbud" Google calendar, so a messy week can be cleared without touching the main calendar.
- Items without a time become all-day events. Times are emitted as UTC (converted from the profile timezone), which every client handles and avoids writing `VTIMEZONE` blocks.
- Delivery: a normal file download on desktop and Android. In an installed iOS PWA, blob downloads are unreliable, so use the Web Share API (`navigator.share({ files: [...] })`) there and fall back to a download link.
- Honest note for the UI: on desktop Google Calendar the import is Settings → Import & export → Import.
- **Future idea (not in v1):** a subscribable calendar feed. A Supabase Edge Function serves `.ics` at a secret per-household URL; you each subscribe once in Google Calendar ("From URL"), and changes show up automatically. Caveat: Google refreshes subscribed calendars slowly (often 8–24 hours), so it suits a week plan, not last-minute changes.

### 6. Shared View
- Header toggle: **Me / Partner / Us**.
- "Us" dashboard: both calorie bars for today, macro breakdowns, weekly averages, shared streak (days both hit goal within a tolerance).
- Partner's log is read-only. Color coding from `profiles.color`.

---

## Folder Structure

```
calbud/
├── index.html
├── public/                 (icons 192/512/maskable, favicon)
├── src/
│   ├── main.tsx / App.tsx  (HashRouter, providers)
│   ├── lib/                (supabase client, queryClient, env)
│   ├── auth/               (login, signup, household wizard, join flow)
│   ├── foods/              (usda.ts, off.ts, search merge, barcode scanner, custom foods)
│   ├── meal-log/           (DayView, AddFood, ServingPicker, Totals)
│   ├── meal-prep/          (PrepBoard, PrepCard, GroceryList)
│   ├── activities/         (WeekGrid, ActivityForm)
│   ├── dashboard/          (UsDashboard, Charts, Streak)
│   ├── export/             (buildIcs.ts + tests)
│   └── components/         (Navbar, PersonToggle, etc.)
├── supabase/
│   └── migrations/         (schema + RLS as versioned SQL)
├── .github/workflows/deploy.yml
├── vite.config.ts
└── package.json
```

---

## GitHub Pages Deployment Checklist

- `vite.config.ts`: `base: '/<repo-name>/'` (or `'/'` with a custom domain).
- Use **HashRouter** so refreshes and deep links work.
- PWA manifest: `start_url` and `scope` must match the base path; include 192, 512 and maskable icons.
- GitHub Actions workflow builds on push to `main` and publishes with `actions/deploy-pages`.
- Secrets/vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (newer projects call it the "publishable" key, older ones the "anon" key), `VITE_USDA_API_KEY`, set as repo variables and injected at build. These end up in the public bundle by design; **RLS is what protects the data**. Never ship the secret / `service_role` key.
- **GitHub Pages on a free account requires a public repo.** That's fine since nothing secret is in the code, but don't commit `.env` files, real data dumps or personal notes. (Private-repo Pages needs a paid plan; Cloudflare Pages or Netlify are free alternatives that host from private repos.)
- Supabase Auth settings: add the Pages URL to Site URL and Redirect URLs.

---

## Supabase Free Tier: What to Know

- ~500 MB database, which is far more than two people's text data will ever use.
- **Projects pause after about 7 days of inactivity.** With two daily users this won't trigger, but after a vacation it might. Resume is one click in the dashboard. A scheduled GitHub Action that pings the API weekly avoids it, but note that GitHub disables scheduled workflows in repos with no commits for 60 days, so it can quietly stop too.
- Free-tier backups are limited, so add a periodic "export my data to CSV/JSON" button in Settings.
- Free plan limits change; confirm current numbers when setting up.

---

## Build Order

### Phase 1: Foundation
Status as of 2026-10-28. ✅ = done, 🟡 = partly done, ⬜ = not started. Details are in [`docs/STATUS.md`](docs/STATUS.md).

1. ✅ Scaffold Vite + React + TS + Tailwind + PWA plugin; get an installable shell deploying to Pages **first**, so deployment issues surface early. *(Tasks 01–02. Live at https://delanoismynameo.github.io/Calbud/.)*
2. ✅ Create the Supabase project; write migrations for the schema, RLS, the profile trigger and the household functions. *(Tasks 03–04. Applied to the real project through the SQL Editor.)*
3. ✅ Test RLS with three test users (two in one household, one outsider): can see partner's logs, cannot write them, cannot see the outsider's. *(Task 05: `npm run test:db`, 31 tests; plus `scripts/dev/check-security.mjs`, 81 checks.)*
4. 🟡 Auth screens (PKCE) and household wizard/join flow; confirm sign-up and password reset work on the deployed Pages URL, not just localhost. *(Tasks 06–08. Sign-up and household creation work live. Password reset hasn't been tested live yet: "Confirm email" is off, and the built-in sender is rate-limited.)*
   - **Done in `main`, tasks 13–14 (2026-10-28); works live once the task 13 migration is applied:** "Join a different household". Someone who is alone in their household (e.g. created one by mistake) must be able to join their partner's from the Us page. This needs a `join_household` change: if the caller's current household has only them, move them and delete that empty household, keeping their meal logs. Update the RLS tests to match. Until then, `supabase/snippets/move-partner-into-household.sql` fixes it by hand. Also find out what the second phone showed when "Join with a code" seemed missing.

### Phase 2: Calorie Tracking
5. ✅ `usda.ts` and `off.ts` clients plus merged search with debounce. *(Tasks 09 and 11. Text search uses USDA generic + USDA Branded, because Open Food Facts search blocks browsers (no CORS). OFF is used only for barcode lookup.)*
6. ✅ Serving picker with macro scaling; `foods` caching; meal log insert with snapshot. *(Task 10. Live.)*
7. ✅ Day view with totals, recents, favorites, custom foods. *(Task 12: the Today screen, with meals, totals against goals, edit and delete. Task 15: recents. Task 16: favorites. Task 17: custom foods.)*
8. ⬜ Barcode scanning. *(`lookupBarcode` for Open Food Facts is ready; USDA `gtinUpc` is a possible fallback.)*

### Phase 3: Planning and Export
9. ⬜ Meal prep board + grocery list + Realtime.
10. ⬜ Activity planner (week grid, both people).
11. ⬜ `.ics` export with unit tests (check output imports cleanly into Google Calendar and an iPhone).

### Phase 4: Sharing, Polish
12. ⬜ Me / Partner / Us toggle and Us dashboard with streak.
13. ⬜ PWA hardening: install prompt (iOS has none; show "Share → Add to Home Screen" instructions), offline app shell, and a service-worker update prompt so new deploys actually reach installed copies.
14. ⬜ *Optional:* an offline write queue for meal logs (IndexedDB) that syncs when connectivity returns. Real work with conflict edge cases; skip unless you log in places with bad signal.
15. ⬜ Settings: goals, timezone, data export, rotate invite code.
16. ⬜ Test install and the full flow on both of your actual phones (especially if one is iPhone and one Android).

*Timeline is flexible; a solid MVP is Phases 1–2 plus the `.ics` export.*

---

## Cost

| Service | Free allowance | Our usage |
|---------|----------------|-----------|
| Supabase | Free plan (DB, auth, realtime) | Tiny; mind the inactivity pause |
| GitHub Pages | Free static hosting | Small bundle |
| USDA FoodData Central | Free key, high rate limit | Mostly cached in our own `foods` table |
| Open Food Facts | Free, no key | Barcodes and packaged items only |
| `.ics` export | No API at all | None |

**Expected monthly cost: $0.**

---

## Decisions (v1)

1. **Tracking scope:** calories and macros only. No weight or water tracking in v1.
2. **Burned calories:** informational only. Shown on activities and the dashboard, never added to the daily calorie goal.
3. **Privacy:** full mutual visibility. No private flag; everything logged is visible to the partner.
4. **Sign-in:** email + password via Supabase Auth. No Google sign-in or magic links in v1.
5. **Calendar:** `.ics` export only. The subscribable feed and the Google Calendar API stay as future ideas, not planned work.
