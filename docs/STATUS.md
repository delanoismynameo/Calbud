# Calbud status: start here

*Last updated 2026-11-02. Update this file at the end of every task.*

## Where things stand
- **Live site:** https://delanoismynameo.github.io/Calbud/, deployed from `main` by GitHub Actions. **Everything through task 11 is live** (pushed 2026-10-28): sign-up, first-run setup, households, the Us page, and adding food with USDA basic and branded search.
- **Task 12 (the Today screen) is live** (pushed 2026-10-28).
- **Tasks 13–14 (switching to a partner's household) are live** (pushed 2026-10-28; the migration is applied).
- **Task 15 (recent foods on Add food) is live** (pushed 2026-10-28), with the 4B's `friendlyError` tests.
- **Task 16 (favorite foods) is live** (pushed 2026-10-28).
- **Task 17 (custom foods) is live** (pushed 2026-10-28).
- **Task 18 (barcode scanning: "Scan a barcode" on Add food, camera via `@zxing/browser`, or a typed code, looked up in Open Food Facts) is live** (pushed 2026-10-28). The camera still needs a test on a real phone.
- **Tasks 19–20 (Open Food Facts serving labels; search ranking) are live** (pushed 2026-10-28).
- **Task 21 (the Prep page: a Sunday-to-Saturday week of shared prep sessions, with add, edit, delete and Planned/Done) is live** (pushed 2026-10-28).
- **Task 22 (the week's grocery list with ticks, and Realtime so both phones' Prep pages update live) is live** (pushed 2026-10-28). Realtime can only be checked on two signed-in phones.
- **Tasks 23–26 are live** (pushed 2026-10-29):
  - 23: prep dishes saved as custom foods, with a Log button on Prep
  - 24: the shared breakfast/lunch/dinner menu, and Today's menu
  - 25: past days on Today, logging to them, and Copy yesterday
  - 26: 11 extra nutrients from USDA and OFF, in a More nutrients panel
- **Tasks 27–28 are live** (pushed 2026-10-29; no migration needed):
  - 27: extra-nutrient inputs on custom foods and prep dishes
  - 28: "Your foods" in Add food's search
- **Task 29 ("cal" instead of "kcal", Prep opens on Menu, goals editable on the Us page) is live** (pushed 2026-10-29; no migration needed).
- **Task 30 (Copy to other days in the slot editor; Repeat last week on Menu and Plan) is live** (pushed 2026-10-29) (no migration needed).
- **Task 31 (Send to Keep on the Grocery list) is live (pushed 2026-10-29).** The real share sheet needs a test on a phone.
- **Tasks 33–34 are live** (deploy run 40911439097, 2026-10-29; no migration needed): 33 the activity planner on the Plan tab, 34 Export week (`.ics`, shared on an iPhone web app, downloaded elsewhere).
- **Tasks 35–37 (the Nutrition Facts label) are live** (deploy run 40918771600, 2026-10-29): 35 the label on the food screen (prep dishes too), 36 Today's "Nutrition facts" panel for the day, 37 a live label preview in the Create a food and prep dish forms.
- **Tasks 38–40 are live** (deploy run 40925785018, 2026-10-29): 38 the "new version is ready" bar and install instructions, 39–40 the Us "This week" card (7-day averages, a shared streak within 10% of goal).
- **Tasks 41–45 (build a food from ingredients) are live** (deploy run 40933227423, 2026-10-29). Migration `20261029000003_recipe.sql` (adds `foods.recipe`, nullable jsonb) was applied first; the column was checked through the REST API.
- **Tasks 46–49 are live** (deploy run 40945816074, 2026-10-29; no migration needed): 46 a **You** card on Us (name, colour, time zone, with "use this phone's time zone"); 47 **Your data** on Us (food log as CSV, everything as JSON); 48 an offline banner; 49 an **Install app** button on Us where the browser offers installation (Chrome, Edge and Samsung Internet on Android, and desktop Chrome), plus PNG and Apple touch icons. That completes game plan items 13 and 15.
  - Create a food and the prep dish form get **Type the numbers / Build from ingredients**. Ingredients come from search, favorites, recents, Your foods or a barcode scan, each with an amount in servings or grams. The dish is divided into servings or by **the cooked weight of the whole dish**, and a label preview shows as you go.
  - A built prep dish reopens with its ingredients, so one line can be changed; it updates the same saved food. 41 is the logic, 42 moved Add food's finder into `FoodFinder`, 43 the `RecipeBuilder`, 44 Create a food, 45 the prep dish.
- **Task 32 (the `.ics` builder, `src/calendar/ics.ts`, no screen yet) is live (deploy run 40880794963), with no screen using it yet.**
- **Scan and correct fixes are live** (pushed 2026-11-01, deploy run 41282035878; migration `20261031000001_food_barcode.sql` applied first through the SQL Editor, and the column was checked through the REST API). These were not tested on a real phone (the camera, and saving on the live database):
  - **Scanner:** a 10 s timeout on the Open Food Facts lookup (the Hi-Chew "Looking up…" hang), TRY_HARDER, 1080p and continuous focus on the camera, and a "type the number under the barcode" hint after 12 s (the gum that never scanned).
  - **Scan flow:** the household's saved food for a barcode comes first, then Open Food Facts and USDA at the same time. USDA is matched by exact barcode (`gtinUpc`, leading zeros ignored); when Open Food Facts has nothing, USDA's food is used; when both answer and the calories differ by at least 20 and more than 15%, the food opens with a red "X says N kcal per 100 g but Y says M" warning.
  - **Food screen:** tap a row (or Calories) on the Nutrition Facts label to correct it for this log; **Edit serving size** changes the serving name and grams (the Servings/Grams toggle is unchanged); a "check this serving" warning when the name's grams disagree with the serving's grams, there is a name but no weight, or the serving is over 1,000 g; the doubled "(31 g) (31 g)" is gone; **Undo** puts everything back.
  - **Save for this barcode:** after a correction, saves the food as the household's own custom food with the barcode (`foods.barcode`, one per household; saving again replaces it), so the next scan of that barcode finds it first.
  - Built by several local models, bench log in `docs/review/model-bench.md` (briefs and exact-instruction prompts, with each model's result).
- **Task 75 is live** (deploy run 41336304990, 2026-11-01; no migration): on the Grocery list, save your Keep grocery note's link once per phone ("Send to one note every time"); then **Send to Keep** copies the list and opens that note to paste into, with **Share instead** for the old share sheet. Not tested on a phone: whether a keep.google.com link opens the Keep app.
- **Meal reminders are live** (deploy run 41581440079, 2026-11-02; migrations `20261102000000`–`20261102000003` applied and the `meal-reminder-scheduler` Edge Function deployed through the Supabase connector). Each person sets a reminder time on the You card (Us). An **in-app toast** shows once a day at that time while the app is open (no permission needed). **Phone push** is an opt-in on the You card: it subscribes the phone (VAPID, `VITE_VAPID_KEY` repo variable) and saves it in `push_subscriptions` (row security, own row only). A pg_cron job calls the function every 10 minutes with `x-cron-secret` (the secret is in Vault and as an Edge Function secret); it signs the push with `web-push`, uses each person's time zone, sends at most once a day (`last_sent_on`) and forgets dead subscriptions. `public/push-sw.js` is loaded into the generated PWA worker through `workbox.importScripts`. **Not tested on a real phone yet.** Built by three local models plus a hand fix, bench log in `docs/review/model-bench.md`.
- **Database:** Supabase project `zwhwgerfzrqnlyirdpek`. All nine migrations in `supabase/migrations/` have been applied through the SQL Editor (the last four on 2026-10-29, `food_barcode` on 2026-11-01, `foods_image_url_and_unit` on 2026-11-02). "Confirm email" is **off**.
- **Real users:** the owner and partner have accounts and share one household. It was merged by hand with `supabase/snippets/move-partner-into-household.sql` after an accidental second household.
- **Checks on `main`:**

  | Command | Result |
  |---|---|
  | `npm test` | 611 passing |
  | `npm run test:db` | 48 passing |
  | `npm run build` | clean |
  | `node scripts/dev/check-security.mjs` | 81 passing |

## How work gets done
A local model in the DeepSeek Harness writes each task from a brief; Claude reviews it, fixes it and writes a review note. See [`docs/review/WORKFLOW.md`](review/WORKFLOW.md) for the loop, the model roles and the lessons. Each task's brief and review is `docs/review/NN-*.md`. The review tools are in [`scripts/dev/`](../scripts/dev/README.md).

Unattended runs (since task 35): Claude runs the harness **headless** in its default workspace-write sandbox, where the model can't run npm. Claude runs the tests and build afterwards. See WORKFLOW.md.

Before sending a task to the harness in the web UI:
- **Start a new session in the Calbud workspace.**
- **Model and effort:** pick the model and set the effort level. The default is the 35B at **High**.
- **Full access:** the user must turn it on in each session; Claude can't.

## Tasks done
| # | Task | Review |
|---|---|---|
| 01–02 | App scaffold and Pages deploy | [01](review/01-scaffold.md), [02](review/02-deploy-workflow.md) |
| 03–05 | Tables, security (RLS, functions), DB tests | [03](review/03-tables-migration.md), [04](review/04-security-migration.md), [05](review/05-rls-tests.md) |
| 06–08 | Auth (PKCE), first-run setup, TanStack Query | [06](review/06-auth-client.md), [07](review/07-household-setup.md), [08](review/08-tanstack-query.md) |
| 09–11 | Food API clients, add-food flow, USDA branded search | [09](review/09-food-clients.md), [10](review/10-add-food.md), [11](review/11-usda-branded.md) |
| 12 | Today screen: meals, totals against goals, edit and delete | [12](review/12-today-screen.md) |
| 13 | `join_household` lets a solo member switch households (SQL + 12 DB tests) | [13](review/13-switch-household.md) |
| 14 | "Join your partner's household instead" on the Us page | [14](review/14-switch-household-ui.md) |
| 15 | Recent foods on Add food (+ a 4B side trial) | [15](review/15-recent-foods.md) |
| 16 | Favorite foods | [16](review/16-favorites.md) |
| 17 | Custom foods (+ the first 35B → 4B delegation) | [17](review/17-custom-foods.md) |
| 18 | Barcode scanning | [18](review/18-barcode-scanning.md) |
| 19 | Open Food Facts serving labels without repeated grams | [19](review/19-off-serving-label.md) |
| 20 | Search ranking: cooking words, one ranked list | [20](review/20-search-ranking.md) |
| 21 | Meal prep week view and form | [21](review/21-prep-week.md) |
| 22 | Grocery list and live updates | [22](review/22-grocery-realtime.md) |
| 22a | Grocery helper on the 4B (side job; failed) | [22a](review/22a-grocery-helper.md) |
| 23 | Prep dishes as custom foods, Log a serving | [23](review/23-prep-dish-food.md) |
| 24 | Shared weekly menu (breakfast/lunch/dinner grid, Today's menu) | [24](review/24-menu-grid.md) |
| 25 | Past days on Today, logging to them, Copy yesterday | [25](review/25-past-days.md) |
| 26 | More nutrients (Nutrition Facts set) | [26](review/26-more-nutrients.md) |
| 27 | Extra-nutrient inputs on own foods and dishes | [27](review/27-own-food-nutrients.md) |
| 28 | Search finds household foods | [28](review/28-search-own-foods.md) |
| 29 | "cal" wording, Menu first, editing goals | [29](review/29-cal-menu-goals.md) |
| 30 | Copy to other days, Repeat last week | [30](review/30-copy-repeat.md) |
| 31 | Send to Keep | [31](review/31-send-to-keep.md) |
| 32 | `.ics` builder | [32](review/32-ics-builder.md) |
| 33 | Activity planner | [33](review/33-activity-planner.md) |
| 34 | Export week (activities) | [34](review/34-export-week.md) |
| 35 | Nutrition Facts label on the food screen | [35](review/35-nutrition-label.md) |
| 36 | The day's totals as a label | [36](review/36-day-label.md) |
| 37 | Live label preview in the food and dish forms | [37](review/37-label-preview.md) |
| 38 | Update prompt and install instructions | [38](review/38-update-prompt.md) |
| 39 | Dashboard stats, data and hook | [39](review/39-dashboard-stats.md) |
| 40 | This week card (Us) | [40](review/40-dashboard-card.md) |
| 41 | Recipe logic (sum ingredients, servings or cooked weight) | [41](review/41-recipe-logic.md) |
| 42 | FoodFinder out of Add food | [42](review/42-food-finder.md) |
| 43 | RecipeBuilder component | [43](review/43-recipe-builder.md) |
| 44 | Build from ingredients in Create a food | [44](review/44-create-from-ingredients.md) |
| 45 | Build a prep dish from ingredients | [45](review/45-dish-from-ingredients.md) |
| 46 | You card (name, colour, time zone) | [46](review/46-you-card.md) |
| 47 | Download your data | [47](review/47-data-export.md) |
| 48 | Offline banner | [48](review/48-offline-banner.md) |
| 49 | Install app button, PNG icons | [49](review/49-install-button.md) |
| 75 | Send the grocery list straight to one saved Keep note | [75](review/75-keep-note.md) |
| 76 | Security check (Claude and the 27B, merged findings) | [76](review/76-security-check.md) |

## Next, in order
0. **The user's list of 2026-11-02, in this order** (short plain prompts, one per run):
   - 76 **Security check**: done ([76](review/76-security-check.md)). **76b next:** check the push endpoint host (DB constraint + the function), revoke anon on `push_subscriptions` and `handle_new_user` from authenticated, longer crypto invite codes, hard-coded push text in the service worker, constant-time secret compare. The user: delete `.env.push-secrets` after the phone test, and turn on leaked password protection in Supabase Auth
   - 77 **Streak = both of you logged food that day** (the shared streak on Us no longer looks at the 10% goal window)
   - 78 **See and edit the Nutrition Facts of a food already logged on Today** (per log, like the food screen's tap-to-correct)
   - 79 **A brand search box** next to the food search, on Add food and in the prep dish builder (USDA branded `brandOwner`/`brandName`)
   - 80 **Water** in fluid ounces: quick-add buttons (8, 16, 24 oz) on Today and a daily oz goal on Us (new table, needs a migration)
   - 81 **Your own photos**: a photo of the finished dish on prep dishes (used as the food's photo when logging) and an optional photo of the recipe; your own photo on custom foods too (Supabase Storage bucket with household-only policies, needs a migration)
1. **Then, one task per run** (the user decided two-in-one runs aren't worth it, 2026-10-29):
   - the game plan's build items are done; left are 14 (optional offline write queue) and 16 (testing on both phones)
   - drinks in millilitres: a food gets a unit (g or ml); the amount box, label ("per 100 ml") and serving show it; treat 1 ml as 1 g, no density; scanned drinks first (Open Food Facts), then custom drinks and the dish builder; shipped: scanned drinks, a g/ml switch, saved foods keeping unit and photo, photos on Today, custom drinks and the dish builder (needs a real-phone check with the OKF aloe drink)
   - food photos, follow-ups: scans show the photo and saved foods keep it (shipped). **Open Food Facts in text search can't be built from the app as it is** (checked 2026-11-02 from a real browser page): the old search address (`world.openfoodfacts.org/cgi/search.pl`) answers 503 "temporarily unavailable", and the new one (`search.openfoodfacts.org/search`) sends no CORS header so browsers block it; only the barcode lookup (`/api/v2/product/<code>`) works from a page. To do it, search through a small Supabase Edge Function that calls the new address and returns the results (needs a deploy, so ask first); until then text search stays USDA only and photos come from scans
   - then the rest of game plan items 13 and 15 (offline app shell, settings: timezone, data export, rotate invite code)
2. **On a phone:** build a food from ingredients with the barcode camera; check the "new version is ready" bar appears and Reload works; on Android tap the "Add to Google Calendar" links under Export week (the share sheet and the downloaded .ics did not work with Google Calendar), and on iPhone check Export week opens in Apple Calendar, and try Send to Keep from the Grocery list (the real share sheet, and with a saved note link: does it open the Keep app?). **Shipped 2026-11-01 without a phone check:** Export week now uses the share sheet on phones and tablets (download on computers), and the help text changed: try it on Android and Apple, and tell me the exact message if it still fails; tap the serving line on the food label to edit it; the grocery list's single list, Add plan button and Bought section with Delete all; the Workout tab name; an editable Nutrition Facts label on each ingredient in the dish builder. **On two phones:** try the barcode camera, and check that a prep or menu change on one phone shows up on the other without a refresh.

## Waiting on the user
- **Test meal reminders on both phones:** install to the Home Screen (iPhone), set a reminder time a few minutes ahead, turn on phone notifications on the You card, lock the phone and wait up to 10 minutes. Delete `.env.push-secrets` (gitignored, holds the VAPID private key and `CRON_SECRET`) once it works.
- **Ask the partner** what her phone showed when "Join with a code" seemed missing.
- **Password reset can't be tested live yet:** Supabase's built-in email sender is heavily rate-limited, so a free SMTP provider (e.g. Resend) is needed before relying on it.

## Rules for anyone working on this repo
- **The repo is public.** Never commit `.env.local`, real emails, keys or data dumps. `supabase/snippets/*.sql` keep placeholder emails.
- **No Claude co-author or "Generated with" lines** in commits or PRs.
- **Only `main` is pushed.** The `task0x-*` branches are local records of model runs.
- **Pushing deploys the live site,** so push only when the user says so.
