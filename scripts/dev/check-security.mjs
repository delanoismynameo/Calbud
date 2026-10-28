// Runs the tables + security migrations on PGlite with a Supabase-like setup, then tests as different users.
// Usage (from the repo root): node scripts/dev/check-security.mjs [tables.sql] [security.sql]
// Defaults to the two migrations in supabase/migrations. Stricter than npm run test:db (81 checks).
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()

let pass = 0, fail = 0
const results = []
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; results.push({ name, cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`) }

// ---- Supabase-like environment ----------------------------------------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Supabase's default privileges: API roles get full table access; RLS is what restricts them.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`)
let haveRealtime = true
try { await db.exec(`create publication supabase_realtime`) } catch (e) { haveRealtime = false; console.log('note: publications unsupported here:', e.message) }

const run = async (file) => { try { await db.exec(readFileSync(file, 'utf8')); return null } catch (e) { return e.message } }
let err = await run(process.argv[2] ?? 'supabase/migrations/20261027000001_tables.sql'); ok('tables migration runs', !err, err ?? '')
err = await run(process.argv[3] ?? 'supabase/migrations/20261027000002_security.sql'); ok('security migration runs', !err, err ?? '')
if (err) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1) }

// ---- helpers -----------------------------------------------------------------------------
const as = async (uid, sql, params = []) => {
  await db.exec('begin')
  try {
    await db.exec(`set local role ${uid ? 'authenticated' : 'anon'}`)
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : ''])
    const r = await db.query(sql, params)
    await db.exec('commit')
    return { rows: r.rows, affected: r.affectedRows ?? 0 }
  } catch (e) { await db.exec('rollback'); return { error: e.message.split('\n')[0] } }
}
const su = async (sql, params = []) => (await db.query(sql, params)).rows
const errs = (name, r) => ok(name, !!r.error, r.error ?? `accepted (${r.affected ?? r.rows?.length} rows)`)
const noErr = (name, r) => ok(name, !r.error, r.error ?? '')

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b'
const C = '00000000-0000-0000-0000-00000000000c', D = '00000000-0000-0000-0000-00000000000d'

// ---- sign-up trigger ---------------------------------------------------------------------
await su(`insert into auth.users (id, email, raw_user_meta_data) values
  ($1, 'alice@x.com', '{"display_name":"Alice"}'), ($2, 'bob@x.com', '{}'),
  ($3, 'carol@x.com', '{"display_name":""}'), ($4, 'dave@x.com', '{}')`, [A, B, C, D])
const names = Object.fromEntries((await su(`select id, display_name from public.profiles`)).map(r => [r.id, r.display_name]))
ok('trigger: profile per new user', Object.keys(names).length === 4)
ok('trigger: display_name from metadata', names[A] === 'Alice', names[A])
ok('trigger: falls back to email prefix (missing)', names[B] === 'bob', names[B])
ok('trigger: falls back to email prefix (empty)', names[C] === 'carol', names[C])

// ---- households ----------------------------------------------------------------------------
let r = await as(A, `select public.create_household('Home') as id`); noErr('A creates household', r)
const H = r.rows?.[0]?.id
ok('A is in the new household', (await su(`select household_id from public.profiles where id=$1`, [A]))[0].household_id === H)
errs('A cannot create a second household', await as(A, `select public.create_household('Again')`))
errs('anon cannot create a household', await as(null, `select public.create_household('X')`))
const code1 = (await su(`select invite_code from public.households where id=$1`, [H]))[0]?.invite_code
r = await as(B, `select public.join_household($1) as id`, [code1]); noErr('B joins with the code', r)
ok('join returns the household id', r.rows?.[0]?.id === H)
const code2 = (await su(`select invite_code from public.households where id=$1`, [H]))[0]?.invite_code
ok('invite code rotated after join', code2 && code2 !== code1 && /^[0-9a-zA-Z]{8}$/.test(code2), `${code1} -> ${code2}`)
errs('C cannot join with the old code', await as(C, `select public.join_household($1)`, [code1]))
errs('C cannot join a full household (new code)', await as(C, `select public.join_household($1)`, [code2]))
errs('B cannot join again', await as(B, `select public.join_household($1)`, [code2]))
errs('unknown code rejected', await as(D, `select public.join_household('zzzzzzzz')`))
errs('anon cannot join', await as(null, `select public.join_household($1)`, [code2]))
r = await as(C, `select public.create_household('Other') as id`); noErr('C creates own household', r)
const HC = r.rows?.[0]?.id

// ---- reads ---------------------------------------------------------------------------------
r = await as(A, `select id from public.profiles order by id`)
ok('A sees own + partner profile only', JSON.stringify(r.rows?.map(x => x.id)) === JSON.stringify([A, B]), r.error ?? r.rows?.map(x => x.display_name).join(','))
r = await as(C, `select id from public.profiles`)
ok('outsider C sees only own profile', r.rows?.length === 1 && r.rows[0].id === C, r.error ?? '')
r = await as(D, `select id from public.profiles`)
ok('user with no household sees own profile', r.rows?.length === 1 && r.rows[0].id === D, r.error ?? '')
r = await as(A, `select id from public.households`)
ok('A sees only own household', r.rows?.length === 1 && r.rows[0].id === H, r.error ?? '')
r = await as(C, `select invite_code from public.households where id=$1`, [H])
ok('C cannot read A household / its code', !r.error && r.rows.length === 0, r.error ?? '')

// ---- meal_logs ---------------------------------------------------------------------------
const logSql = `insert into public.meal_logs (user_id, logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g) values ($1, '2026-10-27', 'lunch', 'Rice', 100, 130, 2.7, 28, 0.3) returning id`
r = await as(A, logSql, [A]); noErr('A logs own meal', r)
const LOG = r.rows?.[0]?.id
errs('A cannot log a meal as B', await as(A, logSql, [B]))
noErr('D (no household) logs own meal', await as(D, logSql, [D]))
r = await as(D, `select count(*)::int n from public.meal_logs`); ok('D sees own log', r.rows?.[0]?.n === 1, r.error ?? '')
r = await as(B, `select id from public.meal_logs`); ok('partner B sees A log', r.rows?.some(x => x.id === LOG), r.error ?? '')
r = await as(C, `select id from public.meal_logs`); ok('outsider C sees no logs', !r.error && r.rows.length === 0, r.error ?? `${r.rows?.length}`)
await as(B, `update public.meal_logs set kcal = 999 where id = $1`, [LOG])
await as(B, `delete from public.meal_logs where id = $1`, [LOG])
const logNow = (await su(`select kcal from public.meal_logs where id=$1`, [LOG]))[0]
ok('B cannot edit or delete A log', logNow && Number(logNow.kcal) === 130, logNow ? `kcal=${logNow.kcal}` : 'deleted')
await as(A, `update public.meal_logs set user_id = $2 where id = $1`, [LOG, B])
ok('A cannot hand a log to B', (await su(`select user_id from public.meal_logs where id=$1`, [LOG]))[0]?.user_id === A)
noErr('A edits own log', await as(A, `update public.meal_logs set kcal = 140 where id = $1`, [LOG]))

// ---- activities --------------------------------------------------------------------------
r = await as(A, `insert into public.activities (user_id, title, scheduled_date) values ($1, 'Run', '2026-10-28') returning id`, [A]); noErr('A adds own activity', r)
const ACT = r.rows?.[0]?.id
errs('A cannot add activity as B', await as(A, `insert into public.activities (user_id, title, scheduled_date) values ($1, 'X', '2026-10-28')`, [B]))
r = await as(B, `select id from public.activities`); ok('B sees A activity', r.rows?.some(x => x.id === ACT), r.error ?? '')
r = await as(C, `select id from public.activities`); ok('C sees no activities', !r.error && r.rows.length === 0, r.error ?? '')
await as(B, `update public.activities set completed = true where id = $1`, [ACT])
ok('B cannot edit A activity', (await su(`select completed from public.activities where id=$1`, [ACT]))[0]?.completed === false)

// ---- meal_prep and foods (shared) --------------------------------------------------------
r = await as(B, `insert into public.meal_prep (household_id, created_by, title, scheduled_date) values ($1, $2, 'Chili', '2026-11-01') returning id`, [H, B]); noErr('B adds household meal prep', r)
const PREP = r.rows?.[0]?.id
r = await as(A, `update public.meal_prep set status = 'done' where id = $1`, [PREP])
ok('partner A can update shared meal prep', !r.error && r.affected === 1, r.error ?? `${r.affected} rows`)
r = await as(C, `select id from public.meal_prep`); ok('C sees no meal prep', !r.error && r.rows.length === 0, r.error ?? '')
errs('C cannot add meal prep to A household', await as(C, `insert into public.meal_prep (household_id, title, scheduled_date) values ($1, 'X', '2026-11-01')`, [H]))
await as(A, `update public.meal_prep set household_id = $2 where id = $1`, [PREP, HC])
ok('A cannot move meal prep to another household', (await su(`select household_id from public.meal_prep where id=$1`, [PREP]))[0]?.household_id === H)
const foodSql = `insert into public.foods (household_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ($1, 'custom', 'Chili', 120, 8, 10, 5) returning id`
noErr('A adds household food', await as(A, foodSql, [H]))
r = await as(B, `select count(*)::int n from public.foods`); ok('B sees household food', r.rows?.[0]?.n === 1, r.error ?? '')
r = await as(C, `select count(*)::int n from public.foods`); ok('C sees no foods', r.rows?.[0]?.n === 0, r.error ?? '')
errs('C cannot add food to A household', await as(C, foodSql, [H]))
errs('D (no household) cannot add food to A household', await as(D, foodSql, [H]))

// ---- profile protections -----------------------------------------------------------------
r = await as(A, `update public.profiles set display_name = 'Al', goal_calories = 1800 where id = $1`, [A])
ok('A updates own name and goal', !r.error && r.affected === 1, r.error ?? `${r.affected} rows`)
await as(A, `update public.profiles set display_name = 'hacked' where id = $1`, [B])
ok('A cannot rename B', (await su(`select display_name from public.profiles where id=$1`, [B]))[0].display_name === 'bob')
await as(A, `update public.profiles set household_id = $2 where id = $1`, [A, HC])
ok('A cannot move self into C household', (await su(`select household_id from public.profiles where id=$1`, [A]))[0].household_id === H)
await as(D, `update public.profiles set household_id = $2 where id = $1`, [D, H])
ok('D cannot move self into A household (3rd member)', (await su(`select household_id from public.profiles where id=$1`, [D]))[0].household_id === null)
await as(A, `update public.profiles set id = $2 where id = $1`, [A, D])
ok('A cannot change own profile id', (await su(`select count(*)::int n from public.profiles where id=$1`, [A]))[0].n === 1)
// A custom setting any role can set (e.g. Swift's app.allow_household_change) must not open a bypass.
await as(D, `with f as (select set_config('app.allow_household_change', 'true', true)) update public.profiles set household_id = $2 from f where id = $1`, [D, HC])
ok('D cannot move into C household even after setting app.* flags', (await su(`select household_id from public.profiles where id=$1`, [D]))[0].household_id === null)
await as(A, `update public.profiles set created_at = '2000-01-01' where id = $1`, [A])
ok('A cannot rewrite own profile created_at', new Date((await su(`select created_at from public.profiles where id=$1`, [A]))[0].created_at).getUTCFullYear() !== 2000)
errs('A cannot insert a profile', await as(A, `insert into public.profiles (id, display_name) values ($1, 'x')`, [D]))
await as(A, `delete from public.profiles where id = $1`, [A])
ok('A cannot delete own profile', (await su(`select count(*)::int n from public.profiles where id=$1`, [A]))[0].n === 1)
await as(A, `update public.households set invite_code = 'aaaaaaaa' where id = $1`, [H])
ok('A cannot set household invite code directly', (await su(`select invite_code from public.households where id=$1`, [H]))[0].invite_code === code2)

// ---- anon ----------------------------------------------------------------------------------
for (const t of ['households', 'profiles', 'foods', 'meal_logs', 'meal_prep', 'activities']) {
  r = await as(null, `select count(*)::int n from public.${t}`)
  ok(`anon reads nothing from ${t}`, !!r.error || r.rows[0].n === 0, r.error ?? `${r.rows[0].n} rows`)
}
errs('anon cannot insert a meal log', await as(null, logSql, [A]))
errs('anon cannot call my_household()', await as(null, `select public.my_household()`))

// ---- function hygiene ----------------------------------------------------------------------
const fns = await su(`select p.proname, p.prosecdef, p.proconfig from pg_proc p where p.pronamespace = 'public'::regnamespace`)
const fnNames = fns.map(f => f.proname)
for (const n of ['my_household', 'handle_new_user', 'create_household', 'join_household']) ok(`function ${n} exists`, fnNames.includes(n))
for (const f of fns.filter(f => f.prosecdef)) ok(`${f.proname}: security definer with empty search_path`, (f.proconfig ?? []).some(c => c === 'search_path=' || c === 'search_path=""'), JSON.stringify(f.proconfig))
for (const n of ['my_household', 'create_household', 'join_household']) {
  const priv = await su(`select has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') auth from pg_proc p where proname = $1 and pronamespace = 'public'::regnamespace`, [n])
  ok(`${n}: execute for authenticated only`, priv[0] && !priv[0].anon && priv[0].auth, JSON.stringify(priv[0]))
}
ok('trigger on_auth_user_created exists', (await su(`select count(*)::int n from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass`))[0].n === 1)

// ---- realtime ------------------------------------------------------------------------------
if (haveRealtime) {
  const pub = (await su(`select tablename from pg_publication_tables where pubname = 'supabase_realtime'`)).map(r => r.tablename).sort()
  ok('realtime publication has meal_logs, meal_prep, activities', JSON.stringify(pub) === JSON.stringify(['activities', 'meal_logs', 'meal_prep']), pub.join(','))
}

// ---- policies use (select auth.uid()) ------------------------------------------------------
const pol = await su(`select tablename, policyname, roles::text, coalesce(qual,'') || ' ' || coalesce(with_check,'') expr from pg_policies where schemaname='public'`)
ok('all policies target authenticated only', pol.length > 0 && pol.every(p => p.roles === '{authenticated}'), pol.filter(p => p.roles !== '{authenticated}').map(p => `${p.tablename}.${p.policyname}:${p.roles}`).join(' '))
const bare = pol.filter(p => /auth\.uid\(\)/.test(p.expr) && !/SELECT auth\.uid\(\)/i.test(p.expr))
ok('policies wrap auth.uid() in a subselect', bare.length === 0, bare.map(p => `${p.tablename}.${p.policyname}`).join(' '))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
