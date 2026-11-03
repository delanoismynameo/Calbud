import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWaterLogs, insertWaterLog, deleteWaterLog } from './waterLogApi'
import type { WaterLog } from './waterTypes'

interface WaterCardProps {
  userId: string
  date: string
  goal: number
  logs: WaterLog[]
}

export default function WaterCard({ userId, date, goal, logs }: WaterCardProps) {
  const [lastAdded, setLastAdded] = useState<WaterLog | null>(null)
  const queryClient = useQueryClient()

  const total = logs.reduce((sum, log) => sum + Number(log.amount_oz), 0)

  const addWaterMutation = useMutation({
    mutationFn: async (amount: number) => {
      await insertWaterLog(userId, date, amount)
      // Fetch the newly created log for undo functionality
      const newLog = (await fetchWaterLogs(userId, date)).slice(-1)[0]
      setLastAdded(newLog || null)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-logs', userId, date] })
    },
  })

  const removeLastMutation = useMutation({
    mutationFn: async () => {
      if (lastAdded) {
        await deleteWaterLog(lastAdded.id)
      }
    },
    onSuccess: () => {
      setLastAdded(null)
      queryClient.invalidateQueries({ queryKey: ['water-logs', userId, date] })
    },
  })

  const isPast = date < new Date().toISOString().split('T')[0]
  const exceeded = total >= goal

  const percentage = goal > 0 ? Math.min(100, (total / goal) * 100) : 0

  return (
    <section className="bg-card rounded-3xl shadow-card p-4 mb-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">Water</span>
        {isPast && (
          <button
            type="button"
            onClick={() => removeLastMutation.mutate()}
            disabled={removeLastMutation.isPending || logs.length === 0}
            className="text-sm text-muted hover:text-ink disabled:cursor-not-allowed"
            aria-label="Undo last water addition"
          >
            Undo
          </button>
        )}
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-bold text-ink">
          {total.toLocaleString()} / {goal} fl oz
        </span>
        <span className={`text-sm font-semibold ${exceeded ? 'text-success' : 'text-muted'}`}>
          {exceeded ? 'Goal reached' : `${Math.round(goal - total)} left`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-line rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-300 ${exceeded ? 'bg-success' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[8, 16, 24].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => addWaterMutation.mutate(amount)}
            disabled={addWaterMutation.isPending || isPast}
            className={`py-2 rounded-2xl text-sm font-semibold ${
              isPast
                ? 'bg-line text-muted cursor-not-allowed'
                : 'bg-coral-deep hover:bg-coral-deeper text-white'
            } disabled:cursor-not-allowed`}
          >
            +{amount} oz
          </button>
        ))}
      </div>

      {lastAdded && (
        <p className="text-xs text-muted mt-2">
          Added {lastAdded.amount_oz} fl oz
        </p>
      )}
    </section>
  )
}