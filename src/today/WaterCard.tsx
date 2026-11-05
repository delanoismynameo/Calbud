import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { insertWaterLog, deleteWaterLog } from './waterLogApi'
import { useWaterLogs } from './useWaterLogs'
import { useProfile } from '../household/useProfile'
import { supabase } from '../lib/supabase'
import { WATER_ADDS, waterProgress, lastAdd, WATER_BOTTLE_OPTIONS } from './water'

// The day's water: total against the goal, a bar, and quick adds. readOnly is for a household member's day.
export default function WaterCard({ userId, date, goal, readOnly = false, bottleOz }: { userId: string; date: string; goal: number; readOnly?: boolean; bottleOz?: number }) {
  const queryClient = useQueryClient()
  const logs = useWaterLogs(userId, date)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['water-logs', userId, date] })
  const { profile, refresh: refreshProfile } = useProfile()

  const initialBottle = bottleOz ?? profile?.bottle_oz ?? 18
  const [bottleOzValue, setBottleOzValue] = useState(initialBottle)

  const add = useMutation({ mutationFn: (oz: number) => insertWaterLog(userId, date, oz), onSettled: refresh })
  const undo = useMutation({ mutationFn: (id: string) => deleteWaterLog(id), onSettled: refresh })

  const setBottleMutation = useMutation({
    mutationFn: async (next: number) => {
      const { error } = await supabase.from('profiles').update({ bottle_oz: next }).eq('id', userId)
      if (error) throw new Error(error.message)
      await refreshProfile()
    },
    onSuccess: () => refresh(),
  })

  const { total, percent, reached } = waterProgress(logs.data ?? [], goal)
  const last = lastAdd(logs.data ?? [])
  const busy = add.isPending || undo.isPending || logs.isFetching
  const failed = add.error ?? undo.error

  return (
    <section className="bg-card rounded-3xl shadow-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">Water</h2>
        {!readOnly && last && (
          <button type="button" onClick={() => undo.mutate(last.id)} disabled={busy}
            aria-label={`Undo the last add (${last.amount_oz} oz)`}
            className="text-sm font-semibold text-link disabled:text-muted">↶ Undo</button>
        )}
      </div>

      {logs.isPending ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : logs.isError ? (
        <p className="text-danger text-sm">Couldn't load water. {logs.error.message}</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-ink">{total} / {goal} fl oz</span>
            <span className={`text-sm font-semibold ${reached ? 'text-water' : 'text-muted'}`}>
              {reached ? 'Goal reached 💧' : `${goal - total} oz to go`}
            </span>
          </div>
          <div className="h-2.5 bg-line rounded-full overflow-hidden" role="progressbar" aria-label="Water"
            aria-valuemin={0} aria-valuemax={goal} aria-valuenow={total}>
            <div className="h-full bg-water rounded-full transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
        </>
      )}

      {!readOnly && (
        <div className="flex items-center gap-2">
          <select id="water-bottle" aria-label="Your water bottle size"
            value={bottleOzValue}
            onChange={(e) => { const next = Number(e.target.value); setBottleMutation.mutate(next) }}
            disabled={busy || logs.isError}
            className="h-full shrink-0 rounded-2xl border border-line bg-card text-sm font-semibold text-ink py-2.5 px-2 disabled:opacity-50">
            {WATER_BOTTLE_OPTIONS.map((oz) => (
              <option key={oz} value={oz}>{oz} oz</option>
            ))}
          </select>
          <button type="button" onClick={() => add.mutate(bottleOzValue)} disabled={busy || logs.isError}
            aria-label={`Add one full bottle (${bottleOzValue} oz)`}
            className="flex-1 py-2.5 rounded-2xl border-2 border-water bg-water text-sm font-bold text-white hover:opacity-90 active:bg-water disabled:opacity-50">
            +bottle ({bottleOzValue} oz)
          </button>
          <div className="grid grid-cols-3 gap-2">
            {WATER_ADDS.map((oz) => (
              <button key={oz} type="button" onClick={() => add.mutate(oz)} disabled={busy || logs.isError}
                className="py-2.5 rounded-2xl border border-line bg-card text-sm font-bold text-water hover:bg-coral-light/50 active:bg-coral-light disabled:opacity-50">
                +{oz} oz
              </button>
            ))}
          </div>
        </div>
      )}
      {failed && <p className="text-danger text-sm">{failed.message}</p>}
    </section>
  )
}
