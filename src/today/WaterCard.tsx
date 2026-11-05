import { useMutation, useQueryClient } from '@tanstack/react-query'
import { insertWaterLog, deleteWaterLog } from './waterLogApi'
import { useWaterLogs } from './useWaterLogs'
import { supabase } from '../lib/supabase'
import { WATER_ADDS, waterProgress, lastAdd, WATER_BOTTLE_OPTIONS } from './water'

// The day's water: total against the goal, a bar, and quick adds. readOnly is for a household member's day.
export default function WaterCard({ userId, date, goal, readOnly = false, bottleOz }: { userId: string; date: string; goal: number; readOnly?: boolean; bottleOz?: number }) {
  const queryClient = useQueryClient()
  const logs = useWaterLogs(userId, date)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['water-logs', userId, date] })

  const add = useMutation({ mutationFn: (oz: number) => insertWaterLog(userId, date, oz), onSettled: refresh })
  const undo = useMutation({ mutationFn: (id: string) => deleteWaterLog(id), onSettled: refresh })

  // The bottle size is saved on your profile; while a change saves, the new size shows straight away.
  const setBottle = useMutation({
    mutationFn: async (next: number) => {
      const { error } = await supabase.from('profiles').update({ bottle_oz: next }).eq('id', userId)
      if (error) throw new Error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['household-data'] }),
  })
  const bottle = setBottle.isPending ? setBottle.variables : (bottleOz ?? 18)

  const { total, percent, reached } = waterProgress(logs.data ?? [], goal)
  const last = lastAdd(logs.data ?? [])
  const busy = add.isPending || undo.isPending || logs.isFetching
  const failed = add.error ?? undo.error ?? setBottle.error

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
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {WATER_ADDS.map((oz) => (
              <button key={oz} type="button" onClick={() => add.mutate(oz)} disabled={busy || logs.isError}
                className="py-2.5 rounded-2xl border border-line bg-card text-sm font-bold text-water hover:bg-coral-light/50 active:bg-coral-light disabled:opacity-50">
                +{oz} oz
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => add.mutate(bottle)} disabled={busy || logs.isError}
              className="flex-1 py-2.5 rounded-2xl bg-water text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
              + Bottle ({bottle} oz)
            </button>
            <select aria-label="Your water bottle size" value={bottle}
              onChange={(e) => setBottle.mutate(Number(e.target.value))} disabled={setBottle.isPending}
              className="rounded-2xl border border-line bg-card text-sm font-semibold text-ink px-3 disabled:opacity-50">
              {WATER_BOTTLE_OPTIONS.map((oz) => <option key={oz} value={oz}>{oz} oz bottle</option>)}
            </select>
          </div>
        </div>
      )}
      {failed && <p className="text-danger text-sm">{failed.message}</p>}
    </section>
  )
}
