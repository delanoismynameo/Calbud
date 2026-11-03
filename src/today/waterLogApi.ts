import { supabase } from '../lib/supabase'
import type { WaterLog } from './waterTypes'

export async function fetchWaterLogs(userId: string, date: string): Promise<WaterLog[]> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_on', date)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchWaterLogsSum(userId: string, date: string): Promise<number> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('amount_oz')
    .eq('user_id', userId)
    .eq('logged_on', date)

  if (error) throw new Error(error.message)
  return (data as { amount_oz: number }[]).reduce((sum, row) => sum + row.amount_oz, 0)
}

export async function insertWaterLog(userId: string, loggedOn: string, amountOz: number): Promise<void> {
  const { error } = await supabase.from('water_logs').insert({
    user_id: userId,
    logged_on: loggedOn,
    amount_oz: amountOz,
  })
  if (error) throw new Error(error.message)
}

export async function deleteWaterLog(id: string): Promise<void> {
  const { error } = await supabase.from('water_logs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}