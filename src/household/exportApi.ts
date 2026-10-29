import { supabase } from '../lib/supabase'

const PAGE = 1000 // the most rows the API returns per request

// Every row of `table`, optionally only where `column` equals `value`, ordered by `order`; read a page at a time.
export async function allRows(table: string, order: string, column?: string, value?: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select('*')
    if (column) query = query.eq(column, value)
    const { data, error } = await query.order(order, { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as Record<string, unknown>[]))
    if (!data || data.length < PAGE) return rows
  }
}

export async function fetchAllData(userId: string): Promise<Record<string, unknown>> {
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)

  return {
    exported_at: new Date().toISOString(),
    profile,
    meal_logs: await allRows('meal_logs', 'logged_on', 'user_id', userId),
    activities: await allRows('activities', 'scheduled_date', 'user_id', userId),
    foods: await allRows('foods', 'created_at'),
    meal_prep: await allRows('meal_prep', 'scheduled_date'),
    menu_slots: await allRows('menu_slots', 'slot_date'),
  }
}
