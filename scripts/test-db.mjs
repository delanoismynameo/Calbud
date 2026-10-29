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
await db.exec(readFileSync(resolve(root, 'supabase', 'migrations', '20261028000001_join_switch.sql'), 'utf8'));
await db.exec(readFileSync(resolve(root, 'supabase', 'migrations', '20261028000002_prep_food.sql'), 'utf8'));
await db.exec(readFileSync(resolve(root, 'supabase', 'migrations', '20261029000001_menu.sql'), 'utf8'));

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
  ok('can add own activity', ins.error === undefined && ins.affected === 1 && actId !== undefined,
     ins.error ? `error: ${ins.error}` : `affected ${ins.affected}; activity id ${actId}`);

  const asPartner = await as(ALICE,
    `insert into activities (user_id, title, scheduled_date) values ($1, 'Partner Run', '2026-10-28')`,
    [BOB]);
  const partnerRows = (await db.query(`select id from activities where user_id = $1 and title = 'Partner Run'`, [BOB])).rows;
  ok('cannot add activity as partner', asPartner.error !== undefined && partnerRows.length === 0,
     `error: ${asPartner.error ?? 'none'}; rows for Bob: ${partnerRows.length}`);

  const bobReads = await as(BOB, 'select id from activities where id = $1', [actId]);
  ok('partner can read activity', bobReads.error === undefined && bobReads.rows.length === 1,
     bobReads.error ? `error: ${bobReads.error}` : `Bob saw ${bobReads.rows.length} rows (want 1)`);

  const carolReads = await as(CAROL, 'select id from activities where id = $1', [actId]);
  ok('outsider cannot read activity', carolReads.error === undefined && carolReads.rows.length === 0,
     carolReads.error ? `error: ${carolReads.error}` : `Carol saw ${carolReads.rows.length} rows (want 0)`);

  const upd = await as(BOB, 'update activities set title = $1 where id = $2', ['Hacked Run', actId]);
  const del = await as(BOB, 'delete from activities where id = $1', [actId]);
  const still = (await db.query('select id, title from activities where id = $1', [actId])).rows;
  ok('partner cannot change or delete activity', still.length === 1 && still[0].title === 'Morning Run',
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

  // Migration 20261028000002: a prep session links to its dish's food; deleting the food clears the link.
  const dish = await as(BOB,
    `insert into foods (household_id, source, source_id, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ($1, 'custom', 'dish-1', 'Curry', 120, 8, 12, 4) returning id`,
    [aliceHouseholdId]);
  const dishId = dish.rows?.[0]?.id;
  const link = await as(BOB, 'update meal_prep set food_id = $1 where id = $2', [dishId, mpId]);
  const linked = (await db.query('select food_id from meal_prep where id = $1', [mpId])).rows[0]?.food_id;
  const embed = await as(ALICE, 'select f.name from meal_prep m join foods f on f.id = m.food_id where m.id = $1', [mpId]);
  const unlink = await as(ALICE, 'delete from foods where id = $1', [dishId]);
  const after = (await db.query('select id, food_id from meal_prep where id = $1', [mpId])).rows;
  ok('prep links to a household food; deleting the food keeps the prep and clears the link',
     dish.error === undefined && link.error === undefined && linked === dishId && embed.rows?.[0]?.name === 'Curry'
       && unlink.error === undefined && after.length === 1 && after[0].food_id === null,
     `food: ${dish.error ?? dishId}; link: ${link.error ?? linked}; partner read: ${JSON.stringify(embed.rows)}; delete: ${unlink.error ?? 'ok'}; after: ${JSON.stringify(after)}`);

  // Migration 20261029000001: the shared weekly menu.
  const slot = await as(ALICE,
    `insert into menu_slots (household_id, slot_date, meal, label, prep_id) values ($1, '2026-10-26', 'dinner', 'Curry', $2)`,
    [aliceHouseholdId, mpId]);
  const bobSees = await as(BOB, `select label, prep_id from menu_slots where slot_date = '2026-10-26'`);
  const bobUpsert = await as(BOB,
    `insert into menu_slots (household_id, slot_date, meal, label) values ($1, '2026-10-26', 'dinner', 'Leftovers')
     on conflict (household_id, slot_date, meal) do update set label = excluded.label, prep_id = excluded.prep_id`,
    [aliceHouseholdId]);
  const slotNow = (await db.query(`select label, prep_id from menu_slots where household_id = $1 and slot_date = '2026-10-26'`, [aliceHouseholdId])).rows;
  ok('partner sees and replaces a shared menu slot',
     slot.error === undefined && bobSees.rows?.length === 1 && bobSees.rows[0].prep_id === mpId
       && bobUpsert.error === undefined && slotNow.length === 1 && slotNow[0].label === 'Leftovers' && slotNow[0].prep_id === null,
     `insert: ${slot.error ?? 'ok'}; Bob saw ${JSON.stringify(bobSees.rows)}; upsert: ${bobUpsert.error ?? 'ok'}; now ${JSON.stringify(slotNow)}`);

  const blank = await as(ALICE,
    `insert into menu_slots (household_id, slot_date, meal, label) values ($1, '2026-10-27', 'lunch', '  ')`, [aliceHouseholdId]);
  const snack = await as(ALICE,
    `insert into menu_slots (household_id, slot_date, meal, label) values ($1, '2026-10-27', 'snack', 'Chips')`, [aliceHouseholdId]);
  ok('menu slot needs a label and breakfast, lunch or dinner', blank.error !== undefined && snack.error !== undefined,
     `blank label: ${blank.error ?? 'accepted'}; snack: ${snack.error ?? 'accepted'}`);

  await as(ALICE, `update menu_slots set prep_id = $1 where household_id = $2`, [mpId, aliceHouseholdId]);
  const cSlots = await as(CAROL, 'select id from menu_slots');
  const cSlotIns = await as(CAROL,
    `insert into menu_slots (household_id, slot_date, meal, label) values ($1, '2026-10-28', 'lunch', 'Evil')`, [aliceHouseholdId]);
  const delPrep = await as(BOB, 'delete from meal_prep where id = $1', [mpId]);
  const kept = (await db.query(`select label, prep_id from menu_slots where household_id = $1`, [aliceHouseholdId])).rows;
  ok('outsider cannot see or add menu slots; deleting the prep keeps the slot and clears the link',
     cSlots.rows?.length === 0 && cSlotIns.error !== undefined && delPrep.error === undefined
       && kept.length === 1 && kept[0].label === 'Leftovers' && kept[0].prep_id === null,
     `Carol saw ${cSlots.rows?.length}; insert: ${cSlotIns.error ?? 'succeeded'}; prep delete: ${delPrep.error ?? 'ok'}; slots ${JSON.stringify(kept)}`);

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
  for (const table of ['households', 'profiles', 'foods', 'meal_logs', 'meal_prep', 'activities', 'menu_slots']) {
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

// ---- Switching households ---------------------------------------------------
{
  const ERIN = '00000000-0000-0000-0000-00000000000e';
  const FRANK = '00000000-0000-0000-0000-00000000000f';
  const GINA = '00000000-0000-0000-0000-000000000010';
  await newUser(ERIN, 'erin@example.com', '{"display_name":"Erin"}');
  await newUser(FRANK, 'frank@example.com', '{"display_name":"Frank"}');
  await newUser(GINA, 'gina@example.com', '{"display_name":"Gina"}');

  const erinCreate = await as(ERIN, "select create_household('Erin')");
  const frankCreate = await as(FRANK, "select create_household('Frank')");
  if (erinCreate.error) throw new Error(`setup failed: Erin create_household: ${erinCreate.error}`);
  if (frankCreate.error) throw new Error(`setup failed: Frank create_household: ${frankCreate.error}`);
  const erinHh = (await db.query('select household_id from profiles where id = $1', [ERIN])).rows[0].household_id;
  const frankHh = (await db.query('select household_id from profiles where id = $1', [FRANK])).rows[0].household_id;

  // Seed data as the superuser: Erin's household has foods A and B, one
  // meal_prep row, and two of Erin's meal logs for today (one per food).
  // Frank's household already has B2, a copy of B (same source and source_id).
  const foodA = (await db.query(
    `insert into foods (household_id, source, source_id, name, kcal_100g, protein_100g, carbs_100g, fat_100g)
     values ($1, 'usda', '111', 'A', 100, 5, 5, 5) returning id`, [erinHh])).rows[0].id;
  const foodB = (await db.query(
    `insert into foods (household_id, source, source_id, name, kcal_100g, protein_100g, carbs_100g, fat_100g)
     values ($1, 'usda', '222', 'B', 100, 5, 5, 5) returning id`, [erinHh])).rows[0].id;
  const foodB2 = (await db.query(
    `insert into foods (household_id, source, source_id, name, kcal_100g, protein_100g, carbs_100g, fat_100g)
     values ($1, 'usda', '222', 'B2', 100, 5, 5, 5) returning id`, [frankHh])).rows[0].id;
  const prepId = (await db.query(
    `insert into meal_prep (household_id, title, scheduled_date) values ($1, 'Erin Prep', '2026-10-28') returning id`,
    [erinHh])).rows[0].id;
  await db.query(
    `insert into meal_logs (user_id, logged_on, meal_type, food_id, name, quantity_g, kcal, protein_g, carbs_g, fat_g)
     values ($1, '2026-10-28', 'breakfast', $2, 'Erin A', 100, 100, 5, 5, 5)`, [ERIN, foodA]);
  await db.query(
    `insert into meal_logs (user_id, logged_on, meal_type, food_id, name, quantity_g, kcal, protein_g, carbs_g, fat_g)
     values ($1, '2026-10-28', 'lunch', $2, 'Erin B', 100, 100, 5, 5, 5)`, [ERIN, foodB]);

  const frankCodeBefore = (await db.query('select invite_code from households where id = $1', [frankHh])).rows[0].invite_code;
  const erinJoin = await as(ERIN, 'select join_household($1)', [frankCodeBefore]);
  const erinHhNow = (await db.query('select household_id from profiles where id = $1', [ERIN])).rows[0].household_id;
  ok('solo member can switch households',
     erinJoin.error === undefined && erinHhNow === frankHh,
     `error: ${erinJoin.error ?? 'none'}; Erin household now ${erinHhNow}, want ${frankHh}`);

  const oldHhRows = (await db.query('select id from households where id = $1', [erinHh])).rows;
  ok('old solo household is deleted', oldHhRows.length === 0,
     `old household ${erinHh} rows: ${JSON.stringify(oldHhRows)}`);

  const logsNow = (await db.query('select id, food_id from meal_logs where user_id = $1 order by id', [ERIN])).rows;
  ok('meal logs survive the switch',
     logsNow.length === 2 && logsNow.every(r => r.food_id !== null),
     `Erin has ${logsNow.length} logs; food_ids: ${logsNow.map(r => r.food_id ?? 'null').join(', ')}`);

  const foodARow = (await db.query('select household_id from foods where id = $1', [foodA])).rows;
  const aLog = logsNow.find(r => r.food_id === foodA);
  ok('new foods move with her',
     foodARow.length === 1 && foodARow[0].household_id === frankHh && aLog !== undefined,
     `food A household: ${foodARow[0]?.household_id ?? 'none'}, want ${frankHh}; log pointing at A: ${aLog ? aLog.id : 'none'}`);

  const foodBRows = (await db.query('select id from foods where id = $1', [foodB])).rows;
  const b2Log = logsNow.find(r => r.food_id === foodB2);
  ok("duplicate foods re-point to the partner's copy",
     foodBRows.length === 0 && b2Log !== undefined,
     `food B rows: ${foodBRows.length} (want 0); log pointing at B2: ${b2Log ? b2Log.id : 'none'}`);

  const prepNow = (await db.query('select household_id from meal_prep where id = $1', [prepId])).rows;
  ok('meal prep moves with her',
     prepNow.length === 1 && prepNow[0].household_id === frankHh,
     `meal_prep household: ${prepNow[0]?.household_id ?? 'none'}, want ${frankHh}`);

  const frankCodeAfter = (await db.query('select invite_code from households where id = $1', [frankHh])).rows[0].invite_code;
  ok('code rotates after a switch', frankCodeAfter !== frankCodeBefore,
     `code before: ${frankCodeBefore}; code after: ${frankCodeAfter}`);

  const ownCode = (await db.query('select invite_code from households where id = $1', [frankHh])).rows[0].invite_code;
  const erinAgain = await as(ERIN, 'select join_household($1)', [ownCode]);
  const erinHhStill = (await db.query('select household_id from profiles where id = $1', [ERIN])).rows[0].household_id;
  ok('cannot rejoin your own household',
     erinAgain.error !== undefined && erinHhStill === frankHh,
     `error: ${erinAgain.error ?? 'none'}; Erin household now ${erinHhStill}, want ${frankHh}`);

  const ginaCreate = await as(GINA, "select create_household('Gina')");
  if (ginaCreate.error) throw new Error(`setup failed: Gina create_household: ${ginaCreate.error}`);
  const ginaHh = (await db.query('select household_id from profiles where id = $1', [GINA])).rows[0].household_id;
  const ginaCode = (await db.query('select invite_code from households where id = $1', [ginaHh])).rows[0].invite_code;
  const aliceHhBefore = (await db.query('select household_id from profiles where id = $1', [ALICE])).rows[0].household_id;
  const aliceTries = await as(ALICE, 'select join_household($1)', [ginaCode]);
  const aliceHhAfter = (await db.query('select household_id from profiles where id = $1', [ALICE])).rows[0].household_id;
  const ginaMembers = (await db.query('select count(*)::int as n from profiles where household_id = $1', [ginaHh])).rows[0].n;
  ok('cannot leave a partner behind',
     aliceTries.error !== undefined && aliceHhAfter === aliceHhBefore && ginaMembers === 1,
     `error: ${aliceTries.error ?? 'none'}; Alice household now ${aliceHhAfter}, want ${aliceHhBefore}; Gina members: ${ginaMembers} (want 1)`);

  const frankCodeNow = (await db.query('select invite_code from households where id = $1', [frankHh])).rows[0].invite_code;
  const ginaFull = await as(GINA, 'select join_household($1)', [frankCodeNow]);
  const ginaHhStill = (await db.query('select household_id from profiles where id = $1', [GINA])).rows[0].household_id;
  const ginaHhRows = (await db.query('select id from households where id = $1', [ginaHh])).rows;
  ok('full household refuses a solo member',
     ginaFull.error !== undefined && ginaHhStill === ginaHh && ginaHhRows.length === 1,
     `error: ${ginaFull.error ?? 'none'}; Gina household now ${ginaHhStill}, want ${ginaHh}; household rows: ${ginaHhRows.length} (want 1)`);

  const ginaBad = await as(GINA, 'select join_household($1)', ['nope1234']);
  const ginaHhStill2 = (await db.query('select household_id from profiles where id = $1', [GINA])).rows[0].household_id;
  const ginaHhRows2 = (await db.query('select id from households where id = $1', [ginaHh])).rows;
  ok('bad code keeps the solo household',
     ginaBad.error !== undefined && ginaHhStill2 === ginaHh && ginaHhRows2.length === 1,
     `error: ${ginaBad.error ?? 'none'}; Gina household now ${ginaHhStill2}, want ${ginaHh}; household rows: ${ginaHhRows2.length} (want 1)`);

  // A solo member entering their own code must not "move" into, and then delete, their own household.
  const ginaOwnCode = (await db.query('select invite_code from households where id = $1', [ginaHh])).rows[0].invite_code;
  const ginaOwn = await as(GINA, 'select join_household($1)', [ginaOwnCode]);
  const ginaHhStill3 = (await db.query('select household_id from profiles where id = $1', [GINA])).rows[0].household_id;
  const ginaHhRows3 = (await db.query('select id from households where id = $1', [ginaHh])).rows;
  ok('solo member cannot rejoin own household',
     /already in that household/.test(ginaOwn.error ?? '') && ginaHhStill3 === ginaHh && ginaHhRows3.length === 1,
     `error: ${ginaOwn.error ?? 'none'}; Gina household now ${ginaHhStill3}, want ${ginaHh}; household rows: ${ginaHhRows3.length} (want 1)`);
}

// ---- summary ----------------------------------------------------------------
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
