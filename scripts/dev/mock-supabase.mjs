// Tiny in-memory stand-in for the Supabase REST endpoints the setup flow uses. Port 54321.
import http from 'node:http'
import { randomUUID } from 'node:crypto'

const ME = '00000000-0000-0000-0000-00000000000a'
const PARTNER = '00000000-0000-0000-0000-00000000000b'
const profiles = {
  [ME]: { id: ME, household_id: null, display_name: 'alice', color: '#6366f1', goal_calories: 2000, goal_protein_g: 150, goal_carbs_g: 250, goal_fat_g: 65, timezone: 'America/New_York', created_at: '2026-10-27T00:00:00Z' },
}
const households = {
  // A household with one member, for the join test.
  'h-partner': { id: 'h-partner', name: "Bob's household", invite_code: 'abcd1234', created_at: '2026-10-27T00:00:00Z' },
}
profiles[PARTNER] = { ...profiles[ME], id: PARTNER, display_name: 'Bob', color: '#10b981', household_id: 'h-partner' }
const foods = []
const mealLogs = []
const mealPrep = []
const menuSlots = []
// Start with Alice already in her own household, so the add-food flow is reachable.
if (process.argv.includes('--in-household')) {
  households['h-alice'] = { id: 'h-alice', name: "Alice's household", invite_code: 'zzzz9999', created_at: '2026-10-27T00:00:00Z' }
  profiles[ME].household_id = 'h-alice'
}
// --with-logs: Bob joins Alice's household, and both have food logged today (local date), plus one
// of Alice's from yesterday. The Today screen must show only Alice's two entries for today.
if (process.argv.includes('--with-logs')) {
  profiles[PARTNER].household_id = profiles[ME].household_id
  const d = new Date(); const day = (n) => { const x = new Date(d); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
  const log = (user_id, logged_on, meal_type, name, quantity_g, kcal, protein_g, carbs_g, fat_g, at) =>
    mealLogs.push({ id: randomUUID(), user_id, logged_on, meal_type, food_id: null, name, quantity_g, kcal, protein_g, carbs_g, fat_g, created_at: at })
  log(ME, day(0), 'breakfast', 'Oatmeal, cooked', 240, 170, 6, 28.8, 3.6, '2026-10-28T12:00:00Z')
  log(ME, day(0), 'lunch', 'Greek yogurt, plain, nonfat, a very long product name that must be truncated on a phone', 150, 89, 15.3, 5.4, 0.6, '2026-10-28T16:00:00Z')
  log(PARTNER, day(0), 'lunch', 'Bob burger', 300, 900, 50, 60, 50, '2026-10-28T16:30:00Z')
  log(ME, day(1), 'dinner', 'Yesterday pasta', 300, 470, 17, 90, 4, '2026-10-27T23:00:00Z')
  // Foods behind Alice's logs, for recents: oatmeal twice (yesterday too), yogurt, pasta; Bob's burger isn't hers.
  const food = (source, source_id, name, brand, serving_g, serving_label, kcal, p, c, f) => {
    const row = { id: randomUUID(), household_id: profiles[ME].household_id, source, source_id, name, brand, serving_g, serving_label, kcal_100g: kcal, protein_100g: p, carbs_100g: c, fat_100g: f, fiber_100g: null, sugar_100g: null, sodium_mg_100g: null, is_favorite: false }
    foods.push(row); return row.id
  }
  const [oat, yog, pasta, burger] = [food('usda', '173904', 'Oatmeal, cooked', null, 240, '1 cup', 71, 2.5, 12, 1.5), food('off', '0123456789012', 'Greek yogurt, plain, nonfat', 'Fage', 150, '1 cup', 59, 10.2, 3.6, 0.4), food('usda', '168927', 'Pasta, cooked', null, null, null, 157, 5.8, 30.6, 0.9), food('usda', '999', 'Bob burger', null, null, null, 300, 17, 20, 17)]
  mealLogs[0].food_id = oat; mealLogs[1].food_id = yog; mealLogs[2].food_id = burger; mealLogs[3].food_id = pasta
  // Extra nutrients (task 26): oatmeal reports some; yogurt reports none, so today's totals have one item missing.
  foods.find((f) => f.id === oat).extra_100g = { fiber_g: 1.7, sodium_mg: 49, iron_mg: 0.9, potassium_mg: 70 }
  mealLogs[0].extra = { fiber_g: 4.1, sodium_mg: 117.6, iron_mg: 2.2, potassium_mg: 168 }
  log(ME, day(1), 'breakfast', 'Oatmeal, cooked', 240, 170, 6, 28.8, 3.6, '2026-10-27T12:00:00Z'); mealLogs[4].food_id = oat
  // Favorites: yogurt (also recent) and a never-logged banana.
  foods.find((f) => f.id === yog).is_favorite = true
  const banana = food('usda', '173944', 'Banana, raw', null, 118, '1 medium', 89, 1.1, 22.8, 0.3)
  foods.find((f) => f.id === banana).is_favorite = true
  // Meal prep this week (Sunday start): curry by Alice with ingredients, meatballs done by Bob, an untimed one.
  const sun = new Date(d); sun.setDate(d.getDate() - d.getDay())
  const wd = (n) => { const x = new Date(sun); x.setDate(sun.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
  const prep = (created_by, scheduled_date, title, start_time, status, servings, ingredients) =>
    mealPrep.push({ id: randomUUID(), household_id: profiles[ME].household_id, created_by, title, recipe_url: null, scheduled_date, start_time, duration_min: 90, status, servings, ingredients, notes: null, food_id: null, created_at: new Date().toISOString() })
  prep(ME, wd(0), 'Curry', '14:00:00', 'planned', 6, [{ name: 'chicken thighs', qty: 2, unit: 'lb' }, { name: 'curry roux', qty: null, unit: '' }, { name: 'rice', qty: 3, unit: 'cup' }])
  // Curry's dish food: a custom food of 350 g per serving at 520 kcal (148.57 kcal / 100 g).
  mealPrep[mealPrep.length - 1].food_id = food('custom', 'dish-curry', 'Curry', null, 350, '1 serving', 148.57, 8.57, 15.71, 5.71)
  prep(PARTNER, wd(0), 'Meatballs', null, 'done', 4, [])
  prep(ME, wd(3), 'Mabodofu, a long dish name to check wrapping on a phone screen', '18:30:00', 'planned', 3, [{ name: 'tofu', qty: 2, unit: '' }])
  // The menu: today's breakfast is free text and today's dinner is the Curry batch (which has a dish food);
  // Saturday lunch is a long list, to check wrapping in the grid. Later rows replace earlier ones in the same slot.
  const curryId = mealPrep[0].id
  const slot = (slot_date, meal, label, prep_id = null) => {
    const old = menuSlots.findIndex((s) => s.slot_date === slot_date && s.meal === meal)
    if (old >= 0) menuSlots.splice(old, 1)
    menuSlots.push({ id: randomUUID(), household_id: profiles[ME].household_id, slot_date, meal, label, prep_id })
  }
  slot(wd(6), 'lunch', 'Sandwich, Fruit Cup, Protein Bar')
  slot(wd(1), 'dinner', 'Curry', curryId)
  slot(day(0), 'breakfast', 'OYO')
  slot(day(0), 'dinner', 'Curry', curryId)
}
const allowed = ['display_name', 'color', 'goal_calories', 'goal_protein_g', 'goal_carbs_g', 'goal_fat_g', 'timezone']
const code8 = () => Math.random().toString(16).slice(2, 10)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Expose-Headers': '*' }
const send = (res, status, body) => { res.writeHead(status, { ...cors, 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)) }
const pgErr = (res, message, status = 400) => send(res, status, { code: 'P0001', message, details: null, hint: null })

// Parses PostgREST filters like id=eq.X and id=neq.X.
const filters = (url) => [...url.searchParams].filter(([k]) => !['select', 'order', 'limit'].includes(k)).map(([k, v]) => { const [op, ...rest] = v.split('.'); return { k, op, v: rest.join('.') } })
const match = (row, fs) => fs.every(({ k, op, v }) => op === 'eq' ? String(row[k]) === v : op === 'neq' ? String(row[k]) !== v : op === 'gte' ? String(row[k]) >= v : op === 'lte' ? String(row[k]) <= v : op === 'not' && v === 'is.null' ? row[k] != null : true)
// Sorts by a PostgREST order param like "scheduled_date.asc,start_time.asc.nullsfirst".
const sortBy = (rows, order) => rows.sort((a, b) => {
  for (const part of order.split(',').filter(Boolean)) {
    const [k, dir = 'asc', nulls] = part.split('.')
    const [x, y] = [a[k], b[k]]
    if (x == null || y == null) { if (x == null && y == null) continue; return (x == null) === (nulls === 'nullsfirst') ? -1 : 1 }
    const c = String(x).localeCompare(String(y)) * (dir === 'desc' ? -1 : 1)
    if (c) return c
  }
  return 0
})

http.createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const url = new URL(req.url, 'http://x')
    console.log(req.method, url.pathname + url.search, body)
    if (req.method === 'OPTIONS') return send(res, 204)
    const single = (req.headers.accept || '').includes('vnd.pgrst.object')
    const table = url.pathname.match(/^\/rest\/v1\/(profiles|households)$/)?.[1]
    if (table) {
      const store = table === 'profiles' ? profiles : households
      let rows = Object.values(store).filter((r) => match(r, filters(url)))
      // RLS-ish: households only your own; profiles only you and your household.
      const mine = profiles[ME].household_id
      rows = rows.filter((r) => table === 'households' ? r.id === mine : r.id === ME || (mine && r.household_id === mine))
      if (req.method === 'PATCH') {
        const patch = JSON.parse(body || '{}')
        const bad = Object.keys(patch).filter((k) => !allowed.includes(k))
        if (bad.length) return pgErr(res, `permission denied for table ${table}`, 403)
        rows.forEach((r) => Object.assign(r, patch))
        return send(res, 204)
      }
      if (single) return rows.length === 1 ? send(res, 200, rows[0]) : send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null })
      return send(res, 200, rows)
    }
    // foods read: your household's only, with eq/neq filters and order=name.
    if (url.pathname === '/rest/v1/foods' && req.method === 'GET') {
      const rows = foods.filter((f) => f.household_id === profiles[ME].household_id && match(f, filters(url)))
      if ((url.searchParams.get('order') || '').startsWith('name')) rows.sort((a, b) => a.name.localeCompare(b.name))
      return send(res, 200, rows)
    }
    // foods upsert and meal_logs insert, recorded for review.
    if (url.pathname === '/rest/v1/foods' && req.method === 'POST') {
      const row = JSON.parse(body)
      if (row.household_id !== profiles[ME].household_id) return pgErr(res, 'new row violates row-level security policy for table "foods"', 403)
      const existing = foods.find((f) => f.household_id === row.household_id && f.source === row.source && f.source_id === row.source_id)
      const saved = existing ? Object.assign(existing, row) : (foods.push({ id: randomUUID(), ...row }), foods[foods.length - 1])
      return single ? send(res, 201, { id: saved.id }) : send(res, 201, [{ id: saved.id }])
    }
    if (url.pathname === '/rest/v1/meal_logs' && req.method === 'POST') {
      // One row, or a list (Copy yesterday); all-or-nothing like a single insert statement.
      const rows = [JSON.parse(body)].flat()
      if (rows.some((r) => r.user_id !== ME)) return pgErr(res, 'new row violates row-level security policy for table "meal_logs"', 403)
      rows.forEach((row) => mealLogs.push({ id: randomUUID(), food_id: null, created_at: new Date().toISOString(), ...row }))
      return send(res, 201)
    }
    // Reads see your rows and your household's (like the real RLS); updates and deletes only touch
    // your own rows, and silently match 0 rows otherwise, as PostgREST does.
    if (url.pathname === '/rest/v1/meal_logs') {
      const mine = profiles[ME].household_id
      const visible = mealLogs.filter((r) => r.user_id === ME || (mine && profiles[r.user_id]?.household_id === mine))
      const fs = filters(url).filter((f) => f.k !== 'order')
      if (req.method === 'GET') {
        let rows = visible.filter((r) => match(r, fs))
        const order = url.searchParams.get('order') || ''
        if (order.startsWith('created_at')) rows.sort((a, b) => a.created_at.localeCompare(b.created_at) * (order.endsWith('.desc') ? -1 : 1))
        if (url.searchParams.get('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')))
        // Embedded foods(*): the food behind each log, if this household can see it.
        if ((url.searchParams.get('select') || '').includes('foods(')) rows = rows.map((r) => ({ ...r, foods: foods.find((f) => f.id === r.food_id && f.household_id === mine) ?? null }))
        return send(res, 200, rows)
      }
      const hit = mealLogs.filter((r) => r.user_id === ME && match(r, fs))
      if (req.method === 'PATCH') { const patch = JSON.parse(body || '{}'); hit.forEach((r) => Object.assign(r, patch)) }
      if (req.method === 'DELETE') hit.forEach((r) => mealLogs.splice(mealLogs.indexOf(r), 1))
      return send(res, 200, hit.map((r) => ({ id: r.id })))
    }
    // meal_prep: either household member reads and changes any of the household's rows.
    if (url.pathname === '/rest/v1/meal_prep') {
      const mine = profiles[ME].household_id
      const fs = filters(url)
      if (req.method === 'POST') {
        const row = JSON.parse(body)
        if (!mine || row.household_id !== mine) return pgErr(res, 'new row violates row-level security policy for table "meal_prep"', 403)
        const saved = { id: randomUUID(), recipe_url: null, start_time: null, duration_min: 60, status: 'planned', servings: 1, ingredients: [], notes: null, food_id: null, created_at: new Date().toISOString(), ...row }
        mealPrep.push(saved)
        return single ? send(res, 201, { id: saved.id }) : send(res, 201, [{ id: saved.id }])
      }
      const hit = mealPrep.filter((r) => mine && r.household_id === mine && match(r, fs))
      if (req.method === 'GET') {
        let rows = sortBy([...hit], url.searchParams.get('order') || '')
        // Embedded foods(*): the dish's food, if this household can see it.
        if ((url.searchParams.get('select') || '').includes('foods(')) rows = rows.map((r) => ({ ...r, foods: foods.find((f) => f.id === r.food_id && f.household_id === mine) ?? null }))
        return send(res, 200, rows)
      }
      if (req.method === 'PATCH') { const patch = JSON.parse(body || '{}'); hit.forEach((r) => Object.assign(r, patch)) }
      if (req.method === 'DELETE') hit.forEach((r) => {
        mealPrep.splice(mealPrep.indexOf(r), 1)
        menuSlots.filter((s) => s.prep_id === r.id).forEach((s) => (s.prep_id = null))
      })
      return send(res, 200, hit.map((r) => ({ id: r.id })))
    }
    // menu_slots: shared like meal_prep. POST is an upsert on (household_id, slot_date, meal); GET embeds
    // meal_prep(title, foods(*)) when asked.
    if (url.pathname === '/rest/v1/menu_slots') {
      const mine = profiles[ME].household_id
      const fs = filters(url).filter((f) => f.k !== 'on_conflict')
      if (req.method === 'POST') {
        const row = JSON.parse(body)
        if (!mine || row.household_id !== mine) return pgErr(res, 'new row violates row-level security policy for table "menu_slots"', 403)
        if (!['breakfast', 'lunch', 'dinner'].includes(row.meal) || !String(row.label ?? '').trim()) return pgErr(res, 'new row for relation "menu_slots" violates check constraint')
        const existing = menuSlots.find((s) => s.household_id === mine && s.slot_date === row.slot_date && s.meal === row.meal)
        const saved = existing ? Object.assign(existing, { prep_id: null, ...row }) : (menuSlots.push({ id: randomUUID(), prep_id: null, ...row }), menuSlots[menuSlots.length - 1])
        return single ? send(res, 201, { id: saved.id }) : send(res, 201, [{ id: saved.id }])
      }
      const hit = menuSlots.filter((r) => mine && r.household_id === mine && match(r, fs))
      if (req.method === 'GET') {
        let rows = sortBy([...hit], url.searchParams.get('order') || '')
        if ((url.searchParams.get('select') || '').includes('meal_prep(')) rows = rows.map((r) => {
          const p = mealPrep.find((m) => m.id === r.prep_id && m.household_id === mine)
          return { ...r, meal_prep: p ? { title: p.title, foods: foods.find((f) => f.id === p.food_id && f.household_id === mine) ?? null } : null }
        })
        return send(res, 200, rows)
      }
      if (req.method === 'PATCH') { const patch = JSON.parse(body || '{}'); hit.forEach((r) => Object.assign(r, patch)) }
      if (req.method === 'DELETE') hit.forEach((r) => menuSlots.splice(menuSlots.indexOf(r), 1))
      return send(res, 200, hit.map((r) => ({ id: r.id })))
    }
    if (url.pathname === '/__state') return send(res, 200, { foods, mealLogs, mealPrep, menuSlots })
    if (url.pathname === '/rest/v1/rpc/create_household') {
      if (profiles[ME].household_id) return pgErr(res, 'create_household: you are already in a household')
      const id = randomUUID()
      households[id] = { id, name: JSON.parse(body).p_name, invite_code: code8(), created_at: new Date().toISOString() }
      profiles[ME].household_id = id
      return send(res, 200, id)
    }
    // Same rules as 20261028000001_join_switch.sql: a solo member may switch, taking their foods along.
    if (url.pathname === '/rest/v1/rpc/join_household') {
      const members = (id) => Object.values(profiles).filter((p) => p.household_id === id).length
      const old = profiles[ME].household_id
      const h = Object.values(households).find((x) => x.invite_code === JSON.parse(body).p_code)
      if (!h) return pgErr(res, 'join_household: no household has that invite code')
      if (h.id === old) return pgErr(res, 'join_household: you are already in that household')
      if (old && members(old) > 1) return pgErr(res, 'join_household: you are already in a household with someone')
      if (members(h.id) >= 2) return pgErr(res, 'join_household: that household already has 2 members')
      profiles[ME].household_id = h.id
      if (old) { foods.filter((f) => f.household_id === old).forEach((f) => (f.household_id = h.id)); delete households[old] }
      h.invite_code = code8()
      return send(res, 200, h.id)
    }
    if (url.pathname === '/__reset') { profiles[ME].household_id = null; return send(res, 200, { ok: true }) }
    send(res, 404, { message: 'not mocked: ' + url.pathname })
  })
}).listen(54321, '127.0.0.1', () => console.log('mock supabase on 54321'))
