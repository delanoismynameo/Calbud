import { supabase } from '../lib/supabase'

export async function allRows(
  table: string,
  order: string,
  column?: string,
  value?: string,
): Promise<Record<string, unknown>[]> {
  let query: any = supabase.from(table).select('*')

  if (column) {
    query = query.eq(column as never, value as never)
  }

  const orderedQuery = query.order(order, { ascending: true })

  let allResults: Record<string, unknown>[] = []

  for (let from = 0; ; from += 1000) {
    const { data, error } = await orderedQuery.range(from, from + 999)

    if (error) throw new Error(error.message)

    const page = ((data ?? []) as unknown[])
    for (const row of page) {
      allResults.push(row as Record<string, unknown>)
    }

    if (page.length < 1000) break
  }

  return allResults
}

export async function fetchAllData(userId: string): Promise<Record<string, unknown>> {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)

  if (profileError) throw new Error(profileError.message)

  const rows = ((profileData ?? []) as any[])
  const profile = rows[0] ?? null

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
