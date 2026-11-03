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
