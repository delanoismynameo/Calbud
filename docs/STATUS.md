# Calbud status: start here

*Last updated 2026-10-28. Update this file at the end of every task.*

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
- **Task 22 (the week's grocery list with ticks, and Realtime so both phones' Prep pages update live) is committed locally, not pushed.** Realtime can only be checked on two signed-in phones after deploying.
- **Database:** Supabase project `zwhwgerfzrqnlyirdpek`. All three migrations in `supabase/migrations/` have been applied through the SQL Editor. "Confirm email" is **off**.
- **Real users:** the owner and partner have accounts and share one household. It was merged by hand with `supabase/snippets/move-partner-into-household.sql` after an accidental second household.
- **Checks on `main`:**

  | Command | Result |
  |---|---|
  | `npm test` | 177 passing |
  | `npm run test:db` | 43 passing |
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

## Next, in order
1. **Push task 22** when the user says so. Then **on two phones:** try the barcode camera, and check that a prep change on one phone shows up on the other without a refresh.
2. **Task 23:** "log servings to my day" when a session is done. `meal_prep` has no nutrition yet, so ask the user how that should work first.
3. **The rest of meal prep** (GAME_PLAN step 9), as GAME_PLAN §3 describes it. Meal prep (step 9) follows GAME_PLAN §3 as written (the user decided 2026-10-28). See the checked-off list in [`GAME_PLAN.md`](../GAME_PLAN.md#build-order).

## Waiting on the user
- **Ask the partner** what her phone showed when "Join with a code" seemed missing.
- **Password reset can't be tested live yet:** Supabase's built-in email sender is heavily rate-limited, so a free SMTP provider (e.g. Resend) is needed before relying on it.

## Rules for anyone working on this repo
- **The repo is public.** Never commit `.env.local`, real emails, keys or data dumps. `supabase/snippets/*.sql` keep placeholder emails.
- **No Claude co-author or "Generated with" lines** in commits or PRs.
- **Only `main` is pushed.** The `task0x-*` branches are local records of model runs.
- **Pushing deploys the live site,** so push only when the user says so.
