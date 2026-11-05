import type { WaterLog } from './waterTypes'

export const WATER_ADDS = [8, 16, 24]

// The bottle sizes offered in the water bottle menu. Selected size lives on your profile.
export const WATER_BOTTLE_OPTIONS = [8, 16, 18, 24, 32]

// The day's water in fl oz, and how far along the goal is (0-100, capped; 0 when the goal isn't set).
export function waterProgress(logs: WaterLog[], goal: number): { total: number; percent: number; reached: boolean } {
  const total = logs.reduce((sum, log) => sum + Number(log.amount_oz), 0)
  const percent = goal > 0 ? Math.min(100, (total / goal) * 100) : 0
  return { total, percent, reached: goal > 0 && total >= goal }
}

// The add that undo removes: the newest one that day.
export function lastAdd(logs: WaterLog[]): WaterLog | null {
  let last: WaterLog | null = null
  for (const log of logs) if (!last || log.created_at >= last.created_at) last = log
  return last
}
