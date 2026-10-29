# Calbud status: start here

*Last updated 2026-10-29. Update this file at the end of every task.*

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
- **Task 33 (the activity planner on the Plan tab: gym and other activities with day, time and length, you and your partner, tick off when done) is in `main`, not pushed.** No migration needed.
- **Task 32 (the `.ics` builder, `src/calendar/ics.ts`, no screen yet) is live (deploy run 40880794963), with no screen using it yet.**
- **Database:** Supabase project `zwhwgerfzrqnlyirdpek`. All six migrations in `supabase/migrations/` have been applied through the SQL Editor (the last three on 2026-10-29). "Confirm email" is **off**.
- **Real users:** the owner and partner have accounts and share one household. It was merged by hand with `supabase/snippets/move-partner-into-household.sql` after an accidental second household.
- **Checks on `main`:**

  | Command | Result |
  |---|---|
  | `npm test` | 279 passing |
  | `npm run test:db` | 48 passing |
  | `npm run build` | clean |
  | `node scripts/dev/check-security.mjs` | 81 passing |

## How work gets done
A local model in the DeepSeek Harness writes each task from a brief; Claude reviews it, fixes it and writes a review note. See [`docs/review/WORKFLOW.md`](review/WORKFLOW.md) for the loop, the model roles and the lessons. Each task's brief and review is `docs/review/NN-*.md`. The review tools are in [`scripts/dev/`](../scripts/dev/README.md).

Before sending a task to the harness:
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

## Next, in order
1. **Next, one task per run** (the user decided two-in-one runs aren't worth it, 2026-10-29):
   - 34: the Export week button, now for activities (gym sessions with times) on the finished `.ics` builder; download, or share on an iOS PWA. Meals become an optional extra
   - the nutrition-facts label (food detail first, then Today's totals)
2. **On a phone:** try Send to Keep from the Grocery list (the real share sheet). **On two phones:** try the barcode camera, and check that a prep or menu change on one phone shows up on the other without a refresh.

## Waiting on the user
- **Ask the partner** what her phone showed when "Join with a code" seemed missing.
- **Password reset can't be tested live yet:** Supabase's built-in email sender is heavily rate-limited, so a free SMTP provider (e.g. Resend) is needed before relying on it.

## Rules for anyone working on this repo
- **The repo is public.** Never commit `.env.local`, real emails, keys or data dumps. `supabase/snippets/*.sql` keep placeholder emails.
- **No Claude co-author or "Generated with" lines** in commits or PRs.
- **Only `main` is pushed.** The `task0x-*` branches are local records of model runs.
- **Pushing deploys the live site,** so push only when the user says so.
