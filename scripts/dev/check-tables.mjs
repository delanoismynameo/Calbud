// Runs a migration against PGlite (Postgres 17 in WASM) with a stub auth.users, then checks behaviour.
// Usage (from the repo root): node scripts/dev/check-tables.mjs [migration.sql]
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
let pass = 0, fail = 0
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`) }
const rejects = async (name, sql) => {
  try { await db.exec(`begin; ${sql}; rollback;`); ok(name, false, 'statement was accepted') }
  catch (e) { await db.exec('rollback').catch(() => {}); ok(name, true, e.message.split('\n')[0]) }
}

console.log('Postgres:', (await db.query('select version()')).rows[0].version.split(' on ')[0])
await db.exec(`create schema auth; create table auth.users (id uuid primary key);`)

try { await db.exec(readFileSync(process.argv[2] ?? 'supabase/migrations/20261027000001_tables.sql', 'utf8')); ok('migration runs top to bottom', true) }
catch (e) { ok('migration runs top to bottom', false, e.message); process.exit(1) }

const tables = ['households', 'profiles', 'foods', 'meal_logs', 'meal_prep', 'activities']
const have = (await db.query(`select tablename from pg_tables where schemaname='public'`)).rows.map(r => r.tablename)
ok('exactly the six tables exist', tables.every(t => have.includes(t)) && have.length === 6, have.join(', '))

const cols = async (t) => (await db.query(`select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`, [t])).rows.map(r => r.column_name)
const expected = {
  households: ['id', 'name', 'invite_code', 'created_at'],
  profiles: ['id', 'household_id', 'display_name', 'color', 'goal_calories', 'goal_protein_g', 'goal_carbs_g', 'goal_fat_g', 'timezone', 'created_at'],
  foods: ['id', 'household_id', 'source', 'source_id', 'name', 'brand', 'serving_g', 'serving_label', 'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g', 'fiber_100g', 'sugar_100g', 'sodium_mg_100g', 'is_favorite', 'created_at'],
  meal_logs: ['id', 'user_id', 'logged_on', 'meal_type', 'food_id', 'name', 'quantity_g', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'created_at'],
  meal_prep: ['id', 'household_id', 'created_by', 'title', 'recipe_url', 'scheduled_date', 'start_time', 'duration_min', 'status', 'servings', 'ingredients', 'notes', 'created_at'],
  activities: ['id', 'user_id', 'title', 'scheduled_date', 'start_time', 'duration_min', 'kcal_burned', 'completed', 'notes', 'created_at'],
}
for (const t of tables) { const c = await cols(t); ok(`${t}: columns`, JSON.stringify([...c].sort()) === JSON.stringify([...expected[t]].sort()), c.join(',')) }

const rls = (await db.query(`select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r'`)).rows
ok('RLS enabled on all six', rls.length === 6 && rls.every(r => r.relrowsecurity))
ok('no policies', (await db.query(`select count(*)::int n from pg_policies`)).rows[0].n === 0)
ok('no functions or triggers added', (await db.query(`select count(*)::int n from pg_proc where pronamespace='public'::regnamespace`)).rows[0].n === 0 && (await db.query(`select count(*)::int n from pg_trigger where not tgisinternal`)).rows[0].n === 0)

const idx = (await db.query(`select indexdef from pg_indexes where schemaname='public'`)).rows.map(r => r.indexdef)
for (const [t, c] of [['meal_logs', 'user_id, logged_on'], ['meal_prep', 'household_id, scheduled_date'], ['activities', 'user_id, scheduled_date'], ['profiles', 'household_id'], ['foods', 'household_id, source, source_id']])
  ok(`index ${t} (${c})`, idx.some(d => d.includes(`public.${t} `) && d.includes(`(${c})`)))

// Happy path with defaults
const u1 = '00000000-0000-0000-0000-000000000001', u2 = '00000000-0000-0000-0000-000000000002'
await db.exec(`insert into auth.users values ('${u1}'), ('${u2}')`)
const h = (await db.query(`insert into households (name) values ('Us') returning id, invite_code`)).rows[0]
ok('invite_code defaults to 8 chars', /^[0-9a-f]{8}$/.test(h.invite_code), h.invite_code)
await db.exec(`insert into profiles (id, household_id, display_name) values ('${u1}', '${h.id}', 'A'), ('${u2}', '${h.id}', 'B')`)
const p = (await db.query(`select * from profiles where id='${u1}'`)).rows[0]
ok('profile defaults', p.color === '#6366f1' && p.goal_calories === 2000 && p.timezone === 'America/New_York')
const f = (await db.query(`insert into foods (household_id, source, source_id, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('${h.id}', 'usda', '123', 'Egg', 143, 12.6, 0.7, 9.5) returning id`)).rows[0]
await db.exec(`insert into foods (household_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('${h.id}', 'custom', 'Chili', 120, 8, 10, 5), ('${h.id}', 'custom', 'Chili 2', 120, 8, 10, 5)`)
ok('two custom foods with null source_id allowed', true)
await db.exec(`insert into meal_logs (user_id, logged_on, meal_type, food_id, name, quantity_g, kcal, protein_g, carbs_g, fat_g) values ('${u1}', '2026-10-27', 'breakfast', '${f.id}', 'Egg', 100, 143, 12.6, 0.7, 9.5)`)
const mp = (await db.query(`insert into meal_prep (household_id, created_by, title, scheduled_date) values ('${h.id}', '${u1}', 'Chili', '2026-11-01') returning *`)).rows[0]
ok('meal_prep defaults', mp.status === 'planned' && mp.duration_min === 60 && mp.servings === 1 && Array.isArray(mp.ingredients) && mp.ingredients.length === 0)
const a = (await db.query(`insert into activities (user_id, title, scheduled_date) values ('${u1}', 'Run', '2026-11-02') returning *`)).rows[0]
ok('activities defaults', a.completed === false && a.duration_min === null)

// Constraints
await rejects('goal_calories 0 rejected', `update profiles set goal_calories = 0 where id='${u1}'`)
await rejects('profile without auth user rejected', `insert into profiles (id, display_name) values (gen_random_uuid(), 'X')`)
await rejects('food source "x" rejected', `insert into foods (household_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('${h.id}', 'x', 'X', 1, 1, 1, 1)`)
await rejects('duplicate usda food rejected', `insert into foods (household_id, source, source_id, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('${h.id}', 'usda', '123', 'Egg again', 1, 1, 1, 1)`)
await rejects('negative kcal_100g rejected', `insert into foods (household_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('${h.id}', 'custom', 'X', -1, 1, 1, 1)`)
await rejects('serving_g 0 rejected', `insert into foods (household_id, source, name, serving_g, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('${h.id}', 'custom', 'X', 0, 1, 1, 1, 1)`)
await rejects('food missing kcal rejected', `insert into foods (household_id, source, name, protein_100g, carbs_100g, fat_100g) values ('${h.id}', 'custom', 'X', 1, 1, 1)`)
await rejects('meal_type "brunch" rejected', `insert into meal_logs (user_id, logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g) values ('${u1}', '2026-10-27', 'brunch', 'X', 1, 1, 1, 1, 1)`)
await rejects('quantity_g 0 rejected', `insert into meal_logs (user_id, logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g) values ('${u1}', '2026-10-27', 'lunch', 'X', 0, 1, 1, 1, 1)`)
await rejects('negative meal kcal rejected', `insert into meal_logs (user_id, logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g) values ('${u1}', '2026-10-27', 'lunch', 'X', 1, -5, 1, 1, 1)`)
await rejects('meal_prep status "cooking" rejected', `insert into meal_prep (household_id, title, scheduled_date, status) values ('${h.id}', 'X', '2026-11-01', 'cooking')`)
await rejects('meal_prep servings 0 rejected', `insert into meal_prep (household_id, title, scheduled_date, servings) values ('${h.id}', 'X', '2026-11-01', 0)`)
await rejects('activity negative kcal_burned rejected', `insert into activities (user_id, title, scheduled_date, kcal_burned) values ('${u1}', 'X', '2026-11-02', -1)`)
await rejects('activity duration 0 rejected', `insert into activities (user_id, title, scheduled_date, duration_min) values ('${u1}', 'X', '2026-11-02', 0)`)

// Delete behaviour
await db.exec(`delete from foods where id='${f.id}'`)
ok('deleting a food keeps the log, food_id set null', (await db.query(`select food_id from meal_logs`)).rows[0]?.food_id === null)
await db.exec(`delete from auth.users where id='${u1}'`)
ok('deleting a user cascades profile, logs, activities', (await db.query(`select (select count(*) from profiles where id='${u1}')::int + (select count(*) from meal_logs)::int + (select count(*) from activities)::int n`)).rows[0].n === 0)
ok('meal_prep survives its creator, created_by set null', (await db.query(`select created_by from meal_prep`)).rows[0]?.created_by === null)
await db.exec(`delete from households where id='${h.id}'`)
ok('deleting household nulls profile.household_id', (await db.query(`select household_id from profiles where id='${u2}'`)).rows[0].household_id === null)
ok('deleting household cascades foods and meal_prep', (await db.query(`select (select count(*) from foods)::int + (select count(*) from meal_prep)::int n`)).rows[0].n === 0)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
