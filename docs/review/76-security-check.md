# 76: Security check (Claude and the 27B, separately)

## Prompt
A short plain prompt (no brief): review the repo for cross-household access, leaked secrets and abuse; read only; findings most serious first with file, abuse and fix; say what you're unsure of.

## Run
- **27B** (qwen3.8 27B tuned server, 64K, High), web UI, Workspace Write. 1 h 7 min, 27 steps, ~7–11 tok/s, 1M tokens (91% cache). Changed no files.
- **Claude** reviewed separately before reading the 27B's answer, and also checked the live project (security advisors, grants, function privileges, the pg_cron job) through the Supabase connector, read only.

## Findings, merged
| # | Finding | Claude | 27B | Severity |
|---|---|---|---|---|
| 1 | The scheduler sends a push to whatever `subscription.endpoint` a user saves, so anyone who signs up (sign-up is open, no email confirmation) can make Supabase's server POST to any URL once a day | found | missed | medium |
| 2 | `.env.push-secrets` (VAPID private key, `CRON_SECRET`) is still on disk; delete once push is tested | (already in Waiting on the user) | found | medium (local only, never committed) |
| 3 | Invite code is 32 bits from `md5(random())`; with open sign-up it can be brute-forced while a household has a free seat | found | found | low now (both seats are taken) |
| 4 | `push_subscriptions` keeps Supabase's default grants to anon (all privileges, live check); RLS blocks it | found | found, but wrongly said Postgres grants anon nothing | low |
| 5 | `handle_new_user` (trigger, security definer) callable by authenticated via `/rpc` (advisor); it errors, but revoke it | found | missed | low |
| 6 | Leaked password protection is off (advisor; a dashboard switch) | found | missed | low |
| 7 | The service worker shows the push title and body as sent; hard-code them, since the text never changes | noted as fine | found | low (needs the VAPID key) |
| 8 | Cron secret compared with `!==`, not constant time | found | found | info |
| 9 | USDA key in the bundle | found | found | info (public data.gov key) |

Both confirmed: RLS on every table and household-scoped, no secrets in any branch's git history, the workflow is build-only, `npm audit` clean. The 27B couldn't see the pg_cron job or dashboard settings; the live check shows the job reads the secret from Vault.

## Verdict
The 27B's report was careful and honest about its limits, but it missed the most useful finding (1) and the two advisor items, and it got Supabase's default anon grants wrong. It also read `.env.push-secrets` into its context (local model, so no leak). Fixes are task 76b.

# 76b: Security fixes

## Prompt
A short plain prompt listing the fixes from 76 (endpoint rule in the DB and the scheduler, revokes, longer secure invite codes, fixed push text, DB tests). Branch `task76b-security-fixes`.

## Run
qwen3.6 35B at High, web UI, Full access. 39 min, 244 steps, 17.6M tokens. It stopped mid-sentence with a to-do still open, and it changed files in `node_modules/@electric-sql/pglite` (restored with `npm ci`).

## What was wrong
- **The migration's `join_household` would have broken joining and opened it up:** it dropped the signed-in, one-household and 2-member checks and the profile move, read a `profiles.user_id` column that doesn't exist, changed the return type to jsonb (Postgres refuses that in `create or replace`), and lost `set search_path = ''`. It used `gen_random_bytes`, which needs pgcrypto.
- **The tests didn't test the migration:** `test-db.mjs` pasted in its own md5 versions of `join_household` and `create_household` (inserting into a non-existent `profiles.user_id`), so passing tests said nothing.
- **The scheduler's endpoint check rejected every endpoint** (compared 8 characters with the 7-character `'https:/'`), so no reminder would ever have been sent; its host list was also invented (`other.push.services.mozilla.com`, `notify.notify.windows.com`).
- Fine as delivered: the fixed text in `push-sw.js`, the constant-time compare, the two revokes.

## What I changed
- Migration rewritten: the endpoint constraint as one host regex on `https://host/` (with `coalesce`, since a missing endpoint gave null and passed the check), the revokes, invite codes from `replace(gen_random_uuid()::text, '-', '')` (32 hex, built in, secure), and `join_household` copied from 20261028000001 with only the rotation line changed.
- `test-db.mjs` restored, then loads the real reminder, push and fix migrations before the setup, so all 48 existing join tests run against the new function; 15 new tests (codes, 4 good and 6 bad endpoints including `@` and look-alike hosts, no endpoint, anon, `handle_new_user`). Mutation check: loosening the regex fails all 6 bad-endpoint tests.
- Scheduler: `isPushEndpoint` with `new URL`, https only, no user or port, the same host regex.
- Checks: tsc clean, 611 tests, 63 DB tests, security checker 81, build clean. The one live subscription is on `fcm.googleapis.com`, so the constraint applies cleanly.

## Verdict
Unusable as delivered: the SQL would have failed to apply, and the edits around it would have weakened joining. When a test environment lacked a function, it rewrote the code under test instead of saying so. Lesson: for SQL that replaces a security function, give the model the existing function and say "change only this line", or use the 27B.
