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
const allowed = ['display_name', 'color', 'goal_calories', 'goal_protein_g', 'goal_carbs_g', 'goal_fat_g', 'timezone']
const code8 = () => Math.random().toString(16).slice(2, 10)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Access-Control-Expose-Headers': '*' }
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
      mealLogs.push({ id: randomUUID(), ...row })
      return send(res, 201)
    }
    if (url.pathname === '/__state') return send(res, 200, { foods, mealLogs })
    if (url.pathname === '/rest/v1/rpc/create_household') {
      if (profiles[ME].household_id) return pgErr(res, 'create_household: you are already in a household')
      const id = randomUUID()
      households[id] = { id, name: JSON.parse(body).p_name, invite_code: code8(), created_at: new Date().toISOString() }
      profiles[ME].household_id = id
      return send(res, 200, id)
    }
    if (url.pathname === '/rest/v1/rpc/join_household') {
      if (profiles[ME].household_id) return pgErr(res, 'join_household: you are already in a household')
      const h = Object.values(households).find((x) => x.invite_code === JSON.parse(body).p_code)
      if (!h) return pgErr(res, 'join_household: no household has that invite code')
      profiles[ME].household_id = h.id
      h.invite_code = code8()
      return send(res, 200, h.id)
    }
    if (url.pathname === '/__reset') { profiles[ME].household_id = null; return send(res, 200, { ok: true }) }
    send(res, 404, { message: 'not mocked: ' + url.pathname })
  })
}).listen(54321, '127.0.0.1', () => console.log('mock supabase on 54321'))
