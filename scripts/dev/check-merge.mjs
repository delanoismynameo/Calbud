// Tests supabase/snippets/move-partner-into-household.sql on PGlite with the real migrations.
// Usage (from the repo root): node scripts/dev/check-merge.mjs
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const repo = 'supabase/migrations/'
const db = new PGlite()
await db.exec(`
  create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create publication supabase_realtime;`)
await db.exec(readFileSync(repo + '20261027000001_tables.sql', 'utf8'))
await db.exec(readFileSync(repo + '20261027000002_security.sql', 'utf8'))

const A = '00000000-0000-0000-0000-00000000000a', W = '00000000-0000-0000-0000-00000000000b'
await db.exec(`insert into auth.users (id, email) values ('${A}', 'Me@Example.com'), ('${W}', 'her@example.com')`)
const as = async (uid, sql) => { await db.exec('begin'); await db.exec('set local role authenticated'); await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid })]); const r = await db.query(sql); await db.exec('commit'); return r.rows }
const mine = (await as(A, `select public.create_household('Mine') as id`))[0].id
const hers = (await as(W, `select public.create_household('Hers') as id`))[0].id
await as(W, `insert into public.meal_logs (user_id, logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g) values ('${W}', '2026-10-27', 'lunch', 'Salad', 100, 50, 1, 5, 1)`)
const codeBefore = (await db.query(`select invite_code from public.households where id = $1`, [mine])).rows[0].invite_code

const sql = readFileSync('supabase/snippets/move-partner-into-household.sql', 'utf8')
  .replace('YOUR_EMAIL@example.com', 'me@example.com').replace('HER_EMAIL@example.com', 'HER@example.com')
await db.exec(sql)

const q = async (s, p = []) => (await db.query(s, p)).rows
const ok = (name, c) => console.log(`${c ? 'PASS' : 'FAIL'}  ${name}`)
ok('wife now in my household', (await q(`select household_id from public.profiles where id = $1`, [W]))[0].household_id === mine)
ok('her old household deleted', (await q(`select count(*)::int n from public.households where id = $1`, [hers]))[0].n === 0)
ok('my household kept', (await q(`select count(*)::int n from public.households where id = $1`, [mine]))[0].n === 1)
ok('her meal log kept', (await q(`select count(*)::int n from public.meal_logs where user_id = $1`, [W]))[0].n === 1)
ok('invite code rotated', (await q(`select invite_code from public.households where id = $1`, [mine]))[0].invite_code !== codeBefore)
ok('she now sees my profile (RLS)', (await as(W, `select count(*)::int n from public.profiles`))[0].n === 2)
let again = null; try { await db.exec(sql) } catch (e) { again = e.message }
ok('running it twice refuses safely', /already in the same household/.test(again ?? ''))
