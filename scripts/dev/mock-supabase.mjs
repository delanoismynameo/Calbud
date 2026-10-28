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
}
const allowed = ['display_name', 'color', 'goal_calories', 'goal_protein_g', 'goal_carbs_g', 'goal_fat_g', 'timezone']
const code8 = () => Math.random().toString(16).slice(2, 10)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Expose-Headers': '*' }
const send = (res, status, body) => { res.writeHead(status, { ...cors, 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)) }
const pgErr = (res, message, status = 400) => send(res, status, { code: 'P0001', message, details: null, hint: null })

// Parses PostgREST filters like id=eq.X and id=neq.X.
const filters = (url) => [...url.searchParams].filter(([k]) => k !== 'select').map(([k, v]) => { const [op, ...rest] = v.split('.'); return { k, op, v: rest.join('.') } })
const match = (row, fs) => fs.every(({ k, op, v }) => op === 'eq' ? String(row[k]) === v : op === 'neq' ? String(row[k]) !== v : true)

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
    // foods upsert and meal_logs insert, recorded for review.
    if (url.pathname === '/rest/v1/foods' && req.method === 'POST') {
      const row = JSON.parse(body)
      if (row.household_id !== profiles[ME].household_id) return pgErr(res, 'new row violates row-level security policy for table "foods"', 403)
      const existing = foods.find((f) => f.household_id === row.household_id && f.source === row.source && f.source_id === row.source_id)
      const saved = existing ? Object.assign(existing, row) : (foods.push({ id: randomUUID(), ...row }), foods[foods.length - 1])
      return single ? send(res, 201, { id: saved.id }) : send(res, 201, [{ id: saved.id }])
    }
    if (url.pathname === '/rest/v1/meal_logs' && req.method === 'POST') {
      const row = JSON.parse(body)
      if (row.user_id !== ME) return pgErr(res, 'new row violates row-level security policy for table "meal_logs"', 403)
      mealLogs.push({ id: randomUUID(), food_id: null, created_at: new Date().toISOString(), ...row })
      return send(res, 201)
    }
    // Reads see your rows and your household's (like the real RLS); updates and deletes only touch
    // your own rows, and silently match 0 rows otherwise, as PostgREST does.
    if (url.pathname === '/rest/v1/meal_logs') {
      const mine = profiles[ME].household_id
      const visible = mealLogs.filter((r) => r.user_id === ME || (mine && profiles[r.user_id]?.household_id === mine))
      const fs = filters(url).filter((f) => f.k !== 'order')
      if (req.method === 'GET') {
        const rows = visible.filter((r) => match(r, fs))
        if ((url.searchParams.get('order') || '').startsWith('created_at')) rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
        return send(res, 200, rows)
      }
      const hit = mealLogs.filter((r) => r.user_id === ME && match(r, fs))
      if (req.method === 'PATCH') { const patch = JSON.parse(body || '{}'); hit.forEach((r) => Object.assign(r, patch)) }
      if (req.method === 'DELETE') hit.forEach((r) => mealLogs.splice(mealLogs.indexOf(r), 1))
      return send(res, 200, hit.map((r) => ({ id: r.id })))
    }
    if (url.pathname === '/__state') return send(res, 200, { foods, mealLogs })
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
