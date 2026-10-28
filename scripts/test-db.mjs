// test-db.mjs — loads the app's two migrations into an in-memory PGlite
// database (real Postgres compiled to WASM) and proves the security rules
// work by acting as different users. Plain Node, no test framework.
//
// Usage: npm run test:db

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- PASS/FAIL helpers ----------------------------------------------------
let passed = 0;
let failed = 0;
function ok(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}  ${detail}`);
  }
}

const db = new PGlite();

// ---- Step 1: Supabase-like scaffolding (SQL exactly as given in the brief)
await db.exec(`
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create publication supabase_realtime;
`);

// Load the app's two migrations, in order (read with fs.readFileSync, run with db.exec).
await db.exec(readFileSync(resolve(root, 'supabase', 'migrations', '20261027000001_tables.sql'), 'utf8'));
await db.exec(readFileSync(resolve(root, 'supabase', 'migrations', '20261027000002_security.sql'), 'utf8'));

// ---- as(): act as a user ---------------------------------------------------
// Runs one statement as `userId` (null = anon) inside its own transaction:
//   1. begin
//   2. set local role authenticated (or anon when userId is null)
//   3. select set_config('request.jwt.claims', $1, true)
//   4. the statement
//   5. commit, or rollback if it threw
// Returns { rows, affected } on success, { error } (first line of the message)
// on failure. Never throws out.
async function as(userId, sql, params) {
  try {
    await db.exec('begin');
    await db.exec(userId ? 'set local role authenticated' : 'set local role anon');
    const claims = userId
      ? JSON.stringify({ sub: userId, role: 'authenticated' })
      : '';
    await db.query('select set_config($1, $2, true)', ['request.jwt.claims', claims]);
    const res = await db.query(sql, params ?? []);
    await db.exec('commit');
    return { rows: res.rows, affected: res.affectedRows ?? 0 };
  } catch (err) {
    try { await db.exec('rollback'); } catch { /* transaction already gone */ }
    return { error: String(err?.message ?? err).split('\n')[0] };
  }
}

// ---- Step 3: the users -----------------------------------------------------
// Inserted as the superuser; the sign-up trigger creates their profiles.
const ALICE = '00000000-0000-0000-0000-00000000000a';
const BOB = '00000000-0000-0000-0000-00000000000b';
const CAROL = '00000000-0000-0000-0000-00000000000c';
const DAVE = '00000000-0000-0000-0000-00000000000d';

const newUser = (id, email, meta) =>
  db.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [id, email, meta]);
await newUser(ALICE, 'alice@example.com', '{"display_name":"Alice"}');
await newUser(BOB, 'bob@example.com', '{}');
await newUser(CAROL, 'carol@example.com', '{"display_name":""}');
await newUser(DAVE, 'dave@example.com', '{}');

// Alice creates 'Home'; the superuser reads its invite code; Bob joins with it.
// Carol creates her own household. Dave stays without one (for the join tests).
const aliceCreate = await as(ALICE, "select create_household('Home')");
if (aliceCreate.error) throw new Error(`setup failed: Alice create_household: ${aliceCreate.error}`);
const aliceHouseholdId = (await db.query('select household_id from profiles where id = $1', [ALICE])).rows[0].household_id;
const bobUsedCode = (await db.query('select invite_code from households where id = $1', [aliceHouseholdId])).rows[0].invite_code;

const bobJoin = await as(BOB, 'select join_household($1)', [bobUsedCode]);
if (bobJoin.error) throw new Error(`setup failed: Bob join_household: ${bobJoin.error}`);
const aliceCurrentCode = (await db.query('select invite_code from households where id = $1', [aliceHouseholdId])).rows[0].invite_code;

const carolCreate = await as(CAROL, "select create_household('Carol')");
if (carolCreate.error) throw new Error(`setup failed: Carol create_household: ${carolCreate.error}`);
const carolHouseholdId = (await db.query('select household_id from profiles where id = $1', [CAROL])).rows[0].household_id;

// ---- Sign-up ---------------------------------------------------------------
{
  const count = (await db.query(
    'select count(*)::int as n from profiles where id in ($1, $2, $3, $4)',
    [ALICE, BOB, CAROL, DAVE]
  )).rows[0].n;
  ok('profiles created by trigger', count === 4, `expected 4 profiles, found ${count}`);

  const aliceName = (await db.query('select display_name from profiles where id = $1', [ALICE])).rows[0].display_name;
  ok('display name from metadata', aliceName === 'Alice', `Alice's display_name is ${JSON.stringify(aliceName)}`);

  const bobName = (await db.query('select display_name from profiles where id = $1', [BOB])).rows[0].display_name;
  const carolName = (await db.query('select display_name from profiles where id = $1', [CAROL])).rows[0].display_name;
  ok('display name falls back to email', bobName === 'bob' && carolName === 'carol',
     `Bob is ${JSON.stringify(bobName)} (want "bob"), Carol is ${JSON.stringify(carolName)} (want "carol")`);
}

// ---- Households ------------------------------------------------------------
{
  const hh = (await db.query(
    `select (select household_id from profiles where id = $1) as alice_hh,
            (select household_id from profiles where id = $2) as bob_hh,
            (select household_id from profiles where id = $3) as carol_hh`,
    [ALICE, BOB, CAROL]
  )).rows[0];
  ok('partners share a household',
     hh.alice_hh !== null && hh.alice_hh === hh.bob_hh && hh.carol_hh !== null && hh.carol_hh !== hh.alice_hh,
     `Alice ${hh.alice_hh}, Bob ${hh.bob_hh}, Carol ${hh.carol_hh}`);

  ok('invite code changes after a join', aliceCurrentCode !== bobUsedCode,
     `code Bob used ${bobUsedCode} still equals current code ${aliceCurrentCode}`);

  const daveOld = await as(DAVE, 'select join_household($1)', [bobUsedCode]);
  const daveOldHh = (await db.query('select household_id from profiles where id = $1', [DAVE])).rows[0].household_id;
  ok('old code cannot be reused', daveOld.error !== undefined && daveOldHh === null,
     `error: ${daveOld.error ?? 'none'}; Dave household: ${daveOldHh ?? 'null'}`);

  const aliceSecond = await as(ALICE, "select create_household('Second')");
  const aliceHhAfter = (await db.query('select household_id from profiles where id = $1', [ALICE])).rows[0].household_id;
  ok('cannot create a second household', aliceSecond.error !== undefined && aliceHhAfter === aliceHouseholdId,
     `error: ${aliceSecond.error ?? 'none'}; Alice household now ${aliceHhAfter}`);

  const daveFull = await as(DAVE, 'select join_household($1)', [aliceCurrentCode]);
  const daveFullHh = (await db.query('select household_id from profiles where id = $1', [DAVE])).rows[0].household_id;
  ok('household is full at 2', daveFull.error !== undefined && daveFullHh === null,
     `error: ${daveFull.error ?? 'none'}; Dave household: ${daveFullHh ?? 'null'}`);

  const carolRead = await as(CAROL, 'select * from households where id = $1', [aliceHouseholdId]);
  ok('outsider cannot read the household', carolRead.error === undefined && carolRead.rows.length === 0,
     carolRead.error ? `error: ${carolRead.error}` : `Carol saw ${carolRead.rows.length} rows (want 0)`);
}

// ---- Profiles ----------------------------------------------------------------
{
  const aliceSees = await as(ALICE, 'select id from profiles order by id');
  const seenIds = aliceSees.rows.map(r => r.id).sort();
  const expectedIds = [ALICE, BOB].sort();
  ok('partner can read partner profile',
     aliceSees.error === undefined && seenIds.length === 2 &&
     seenIds[0] === expectedIds[0] && seenIds[1] === expectedIds[1],
     aliceSees.error ? `error: ${aliceSees.error}` : `Alice saw [${seenIds.join(', ')}], want [${expectedIds.join(', ')}]`);

  const carolSees = await as(CAROL, 'select id from profiles order by id');
  ok('outsider sees only self',
     carolSees.error === undefined && carolSees.rows.length === 1 && carolSees.rows[0].id === CAROL,
     carolSees.error ? `error: ${carolSees.error}` : `Carol saw [${carolSees.rows.map(r => r.id).join(', ')}], want [${CAROL}]`);

  const rename = await as(ALICE, 'update profiles set display_name = $1 where id = $2', ['Alicia', ALICE]);
  const aliceName = (await db.query('select display_name from profiles where id = $1', [ALICE])).rows[0].display_name;
  ok('can edit own display name', rename.error === undefined && aliceName === 'Alicia',
     rename.error ? `error: ${rename.error}` : `Alice's name is now ${JSON.stringify(aliceName)}, want "Alicia"`);

  const badRename = await as(ALICE, 'update profiles set display_name = $1 where id = $2', ['Bobby', BOB]);
  const bobName = (await db.query('select display_name from profiles where id = $1', [BOB])).rows[0].display_name;
  ok('cannot edit partner profile', badRename.error === undefined && badRename.affected === 0 && bobName === 'bob',
     badRename.error ? `error: ${badRename.error}` : `affected ${badRename.affected}; Bob's name is now ${JSON.stringify(bobName)}, want "bob"`);

  const move = await as(ALICE, 'update profiles set household_id = $1 where id = $2', [carolHouseholdId, ALICE]);
  const aliceHhAfter = (await db.query('select household_id from profiles where id = $1', [ALICE])).rows[0].household_id;
  ok('cannot move to another household', aliceHhAfter === aliceHouseholdId,
     `error: ${move.error ?? 'none'}; Alice household now ${aliceHhAfter}, want ${aliceHouseholdId}`);

  const origCreated = (await db.query('select created_at from profiles where id = $1', [ALICE])).rows[0].created_at;
  const changeCreated = await as(ALICE, 'update profiles set created_at = $1 where id = $2', ['2000-01-01', ALICE]);
  const afterCreated = (await db.query('select created_at from profiles where id = $1', [ALICE])).rows[0].created_at;
  ok('cannot change created_at', String(afterCreated) === String(origCreated),
     `error: ${changeCreated.error ?? 'none'}; created_at went from ${origCreated} to ${afterCreated}`);
}

// ---- Meal logs -----------------------------------------------------------------
{
  const ins = await as(ALICE,
    `insert into meal_logs (user_id, logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g)
     values ($1, '2026-10-27', 'lunch', 'Test Salad', 200, 300, 20, 25, 10)`,
    [ALICE]);
  const logId = (await db.query(`select id from meal_logs where user_id = $1 and name = 'Test Salad'`, [ALICE])).rows[0]?.id;
  ok('can log own meal', ins.error === undefined && ins.affected === 1 && logId !== undefined,
     ins.error ? `error: ${ins.error}` : `affected ${ins.affected}; log id ${logId}`);

  const asPartner = await as(ALICE,
    `insert into meal_logs (user_id, logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g)
     values ($1, '2026-10-27', 'dinner', 'Partner Meal', 100, 100, 10, 10, 5)`,
    [BOB]);
  const partnerRows = (await db.query(`select id from meal_logs where user_id = $1 and name = 'Partner Meal'`, [BOB])).rows;
  ok('cannot log as partner', asPartner.error !== undefined && partnerRows.length === 0,
     `error: ${asPartner.error ?? 'none'}; rows for Bob: ${partnerRows.length}`);

  const bobReads = await as(BOB, 'select id from meal_logs where id = $1', [logId]);
  ok('partner can read', bobReads.error === undefined && bobReads.rows.length === 1,
     bobReads.error ? `error: ${bobReads.error}` : `Bob saw ${bobReads.rows.length} rows (want 1)`);

  const carolReads = await as(CAROL, 'select id from meal_logs where id = $1', [logId]);
  ok('outsider cannot read', carolReads.error === undefined && carolReads.rows.length === 0,
     carolReads.error ? `error: ${carolReads.error}` : `Carol saw ${carolReads.rows.length} rows (want 0)`);

  const upd = await as(BOB, 'update meal_logs set name = $1 where id = $2', ['Hacked Meal', logId]);
  const del = await as(BOB, 'delete from meal_logs where id = $1', [logId]);
  const still = (await db.query('select id, name from meal_logs where id = $1', [logId])).rows;
  ok('partner cannot change or delete', still.length === 1 && still[0].name === 'Test Salad',
     `update: ${upd.error ?? `affected ${upd.affected}`}; delete: ${del.error ?? `affected ${del.affected}`}; now ${JSON.stringify(still)}`);
}

// ---- Activities ------------------------------------------------------------------
{
  const ins = await as(ALICE,
    `insert into activities (user_id, title, scheduled_date) values ($1, 'Morning Run', '2026-10-28')`,
    [ALICE]);
  const actId = (await db.query(`select id from activities where user_id = $1 and title = 'Morning Run'`, [ALICE])).rows[0]?.id;
  ok('can log own meal', ins.error === undefined && ins.affected === 1 && actId !== undefined,
     ins.error ? `error: ${ins.error}` : `affected ${ins.affected}; activity id ${actId}`);

  const asPartner = await as(ALICE,
    `insert into activities (user_id, title, scheduled_date) values ($1, 'Partner Run', '2026-10-28')`,
    [BOB]);
  const partnerRows = (await db.query(`select id from activities where user_id = $1 and title = 'Partner Run'`, [BOB])).rows;
  ok('cannot log as partner', asPartner.error !== undefined && partnerRows.length === 0,
     `error: ${asPartner.error ?? 'none'}; rows for Bob: ${partnerRows.length}`);

  const bobReads = await as(BOB, 'select id from activities where id = $1', [actId]);
  ok('partner can read', bobReads.error === undefined && bobReads.rows.length === 1,
     bobReads.error ? `error: ${bobReads.error}` : `Bob saw ${bobReads.rows.length} rows (want 1)`);

  const carolReads = await as(CAROL, 'select id from activities where id = $1', [actId]);
  ok('outsider cannot read', carolReads.error === undefined && carolReads.rows.length === 0,
     carolReads.error ? `error: ${carolReads.error}` : `Carol saw ${carolReads.rows.length} rows (want 0)`);

  const upd = await as(BOB, 'update activities set title = $1 where id = $2', ['Hacked Run', actId]);
  const del = await as(BOB, 'delete from activities where id = $1', [actId]);
  const still = (await db.query('select id, title from activities where id = $1', [actId])).rows;
  ok('partner cannot change or delete', still.length === 1 && still[0].title === 'Morning Run',
     `update: ${upd.error ?? `affected ${upd.affected}`}; delete: ${del.error ?? `affected ${del.affected}`}; now ${JSON.stringify(still)}`);
}

// ---- Shared meal prep and foods ----------------------------------------------------
{
  const insMp = await as(ALICE,
    `insert into meal_prep (household_id, title, scheduled_date) values ($1, 'Prep Day', '2026-10-28')`,
    [aliceHouseholdId]);
  const mpId = (await db.query(`select id from meal_prep where household_id = $1 and title = 'Prep Day'`, [aliceHouseholdId])).rows[0]?.id;
  const updMp = await as(BOB, 'update meal_prep set title = $1 where id = $2', ['Better Prep', mpId]);
  const mpNow = (await db.query('select title from meal_prep where id = $1', [mpId])).rows;
  ok('partner can edit shared meal prep',
     insMp.error === undefined && mpId !== undefined && updMp.error === undefined && mpNow.length === 1 && mpNow[0].title === 'Better Prep',
     `insert: ${insMp.error ?? 'ok'}; id ${mpId}; update: ${updMp.error ?? `affected ${updMp.affected}`}; title now ${JSON.stringify(mpNow[0]?.title)}`);

  const cMp = await as(CAROL, 'select id from meal_prep');
  const cMpIns = await as(CAROL,
    `insert into meal_prep (household_id, title, scheduled_date) values ($1, 'Evil Prep', '2026-10-28')`,
    [aliceHouseholdId]);
  const evilMp = (await db.query(`select id from meal_prep where title = 'Evil Prep'`)).rows;
  ok('outsider cannot see or add meal prep',
     cMp.error === undefined && cMp.rows.length === 0 && cMpIns.error !== undefined && evilMp.length === 0,
     `Carol saw ${cMp.rows.length} rows (want 0); insert: ${cMpIns.error ?? 'succeeded'}; 'Evil Prep' rows: ${evilMp.length}`);

  const mvMp = await as(ALICE, 'update meal_prep set household_id = $1 where id = $2', [carolHouseholdId, mpId]);
  const mpHh = (await db.query('select household_id from meal_prep where id = $1', [mpId])).rows;
  ok('cannot move meal prep out', mpHh.length === 1 && mpHh[0].household_id === aliceHouseholdId,
     `error: ${mvMp.error ?? 'none'}; meal_prep household now ${mpHh[0]?.household_id}, want ${aliceHouseholdId}`);

  const cFd = await as(CAROL, 'select id from foods');
  const cFdIns = await as(CAROL,
    `insert into foods (household_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g)
     values ($1, 'custom', 'Evil Food', 100, 5, 5, 5)`,
    [aliceHouseholdId]);
  const evilFd = (await db.query(`select id from foods where name = 'Evil Food'`)).rows;
  ok('outsider cannot see or add foods',
     cFd.error === undefined && cFd.rows.length === 0 && cFdIns.error !== undefined && evilFd.length === 0,
     `Carol saw ${cFd.rows.length} rows (want 0); insert: ${cFdIns.error ?? 'succeeded'}; 'Evil Food' rows: ${evilFd.length}`);
}

// ---- Not signed in --------------------------------------------------------------------
{
  const problems = [];
  for (const table of ['households', 'profiles', 'foods', 'meal_logs', 'meal_prep', 'activities']) {
    const r = await as(null, `select * from ${table}`);
    if (r.error === undefined && r.rows.length > 0) {
      problems.push(`${table}: ${r.rows.length} rows (want error or 0)`);
    }
  }
  ok('anon reads nothing', problems.length === 0, problems.join('; '));

  const anonFn = await as(null, "select create_household('x')");
  ok('anon cannot call household functions', anonFn.error !== undefined,
     anonFn.error ? `error: ${anonFn.error}` : 'no error; result ' + JSON.stringify(anonFn.rows));
}

// ---- summary ----------------------------------------------------------------
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
