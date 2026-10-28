# Calbud status: start here

*Last updated 2026-10-28. Update this file at the end of every task.*

## Where things stand
- **Live site:** https://delanoismynameo.github.io/Calbud/, deployed from `main` by GitHub Actions. **It's live as of task 09:** sign-up, first-run setup, households and the Us page work.
- **`main` is ahead of the live site** with tasks 10–11 (adding food, USDA branded search). These aren't pushed yet; the plan is to push once the Today screen exists, so logged food is visible.
- **Database:** Supabase project `zwhwgerfzrqnlyirdpek`. Both migrations in `supabase/migrations/` have been applied through the SQL Editor. "Confirm email" is **off**.
- **Real users:** the owner and partner have accounts and share one household. It was merged by hand with `supabase/snippets/move-partner-into-household.sql` after an accidental second household.
- **Checks on `main`:**

  | Command | Result |
  |---|---|
  | `npm test` | 53 passing |
  | `npm run test:db` | 31 passing |
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

## Next, in order
1. **Task 12, Today screen:** today's meal logs grouped by meal, totals against goals (calories plus macro bars), and editing or deleting an entry. It reads `meal_logs` for the user's local date with the TanStack Query key `['meal-logs', …]`; the add-food flow already invalidates `['meal-logs']`. Afterwards: a click-through against the mock, then **push** (with the user's OK).
2. **"Join a different household":** let someone who is alone in their household join their partner's from the Us page. It needs a migration changing `join_household`, plus updated DB tests and UI. See GAME_PLAN build step 4.
3. **The rest of the build plan,** from step 7: recents, favorites and custom foods, then barcode scanning. See the checked-off list in [`GAME_PLAN.md`](../GAME_PLAN.md#build-order).

## Waiting on the user
- **Ask the partner** what her phone showed when "Join with a code" seemed missing.
- **Password reset can't be tested live yet:** Supabase's built-in email sender is heavily rate-limited, so a free SMTP provider (e.g. Resend) is needed before relying on it.

## Rules for anyone working on this repo
- **The repo is public.** Never commit `.env.local`, real emails, keys or data dumps. `supabase/snippets/*.sql` keep placeholder emails.
- **No Claude co-author or "Generated with" lines** in commits or PRs.
- **Only `main` is pushed.** The `task0x-*` branches are local records of model runs.
- **Pushing deploys the live site,** so push only when the user says so.
