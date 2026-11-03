import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocalDate } from '../lib/useLocalDate'
import type { Profile } from '../lib/types'
import { fetchMealLogs } from '../today/mealLogApi'
import { useQuery as useWaterQuery } from '@tanstack/react-query'
import { fetchWaterLogs } from '../today/waterLogApi'
import { sumLogs, groupByMeal } from '../today/totals'
import { dayTitle } from '../today/day'
import { ringDash } from '../today/ringMath'
import KcalRing from '../today/KcalRing'
import DayStrip from '../today/DayStrip'
import MealSection from '../today/MealSection'
import MacroPills from '../today/MacroPills'
import MoreNutrients from '../today/MoreNutrients'

export default function PersonDay({ person, onBack }: { person: Profile; onBack: () => void }) {
  const today = useLocalDate()
  const [date, setDate] = useState(today)

  const logs = useQuery({
    queryKey: ['meal-logs', person.id, date],
    queryFn: () => fetchMealLogs(person.id, date)
  })

  const waterLogs = useWaterQuery({
    queryKey: ['water-logs', person.id, date],
    queryFn: () => fetchWaterLogs(person.id, date)
  })

  const total = sumLogs(logs.data ?? [])
  const groups = groupByMeal(logs.data ?? [])

  const waterTotal = waterLogs.data?.reduce((sum, log) => sum + log.amount_oz, 0) ?? 0
  const waterGoal = person.goal_water_oz ?? 64

  const goals = {
    kcal: person.goal_calories ?? 0,
    protein_g: person.goal_protein_g ?? 0,
    carbs_g: person.goal_carbs_g ?? 0,
    fat_g: person.goal_fat_g ?? 0,
  }

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-link">‹ Back</button>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: person.color }} />
        <h1 className="text-lg font-extrabold text-ink">{person.display_name}</h1>
      </div>
      <p className="text-sm font-semibold text-link">{dayTitle(date, today)}</p>
      {logs.isError && (
        <div className="bg-card rounded-3xl shadow-card p-6 text-center">
          <p className="text-danger font-semibold">Couldn't load their food.</p>
          <p className="text-muted text-sm">{logs.error.message}</p>
        </div>
      )}
      {logs.isPending && (
        <p className="text-muted text-center py-8">Loading…</p>
      )}
      {!logs.isError && !logs.isPending && (
        <>
          <KcalRing consumed={total.kcal} goal={goals.kcal} />
          <DayStrip selected={date} today={today} onPick={setDate} />

          {/* Water indicator for partner (read only) */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">Water</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink">
                {waterTotal} / {waterGoal} fl oz
              </span>
              <div className="w-16 h-2 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${Math.min(100, (waterTotal / waterGoal) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {groups.map((g) =>
            g.meal === 'snack' && g.logs.length === 0 ? null : (
              <MealSection key={g.meal} meal={g.meal} logs={g.logs} readOnly />
            )
          )}
          <MacroPills protein={{ value: total.protein_g, goal: goals.protein_g }} carbs={{ value: total.carbs_g, goal: goals.carbs_g }} fat={{ value: total.fat_g, goal: goals.fat_g }} />
          {logs.data && logs.data.length > 0 && <MoreNutrients logs={logs.data} />}
        </>
      )}
    </div>
  )
}