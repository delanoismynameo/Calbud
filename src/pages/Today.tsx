import { Link, useSearchParams } from 'react-router'
import { useState } from 'react'
import { useLocalDate } from '../lib/useLocalDate'
import { useMealLogs } from '../today/useMealLogs'
import { useProfile } from '../household/useProfile'
import { sumLogs, groupByMeal } from '../today/totals'
import { addDays, dayLabel } from '../prep/week'
import { validDayParam, dayTitle, copyRows } from '../today/day'
import { insertMealLogs } from '../today/mealLogApi'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import TodayMenu from '../menu/TodayMenu'
import MoreNutrients from '../today/MoreNutrients'
import MacroPills from '../today/MacroPills'
import MealSection from '../today/MealSection'
import KcalRing from '../today/KcalRing'
import DayStrip from '../today/DayStrip'
import ServingPicker from '../food/ServingPicker'
import type { FoodResult } from '../food/types'
import type { MenuMeal } from '../menu/types'

export default function Today() {
  const today = useLocalDate()
  const [params, setParams] = useSearchParams()
  const date = validDayParam(params.get('date'), today) ?? today
  const isToday = date === today

  const logs = useMealLogs(date)
  const { profile } = useProfile()

  const total = logs.isPending ? null : sumLogs(logs.data ?? [])
  const goals = {
    kcal: (profile?.goal_calories ?? 0),
    protein_g: (profile?.goal_protein_g ?? 0),
    carbs_g: (profile?.goal_carbs_g ?? 0),
    fat_g: (profile?.goal_fat_g ?? 0),
  }

  const groups = logs.isPending ? [] : groupByMeal(logs.data ?? [])

  const [logging, setLogging] = useState<{ food: FoodResult; meal: MenuMeal } | null>(null)

  const goTo = (d: string) => {
    setParams(d === today ? {} : { date: d })
  }

  const prev = addDays(date, -1)
  const prevLogs = useMealLogs(prev)

  const copyPrevMutation = useMutation({
    mutationFn: async () => {
      await insertMealLogs(copyRows(prevLogs.data ?? [], date))
    },
    // Stay pending until the day reloads, so the button can't copy twice.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-logs'] }),
  })

  if (logging) {
    const loggedOn = isToday ? undefined : date
    return <ServingPicker food={logging.food} meal={logging.meal} onLogged={() => setLogging(null)} onCancel={() => setLogging(null)} loggedOn={loggedOn} />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="rounded-full bg-coral-light px-4 py-2 text-sm font-semibold text-link">{dayTitle(date, today)}</h1>
        <div className="flex items-center gap-3">
          {!isToday && (
            <button type="button" onClick={() => goTo(today)}
              className="text-sm font-semibold text-link underline">Back to today</button>
          )}
          <Link to={isToday ? '/add' : `/add?date=${date}`}
            className="rounded-full bg-coral-deep hover:bg-coral-deeper px-4 py-2 text-sm font-bold text-white">+ Add food</Link>
        </div>
      </div>

      {logs.isError ? (
        <>
          <div className="bg-card rounded-3xl shadow-card p-6 text-center space-y-3">
            <p className="text-danger font-semibold">Couldn't load {isToday ? "today's" : "this day's"} food.</p>
            <p className="text-muted text-sm">{logs.error.message}</p>
            <button
              type="button"
              onClick={() => logs.refetch()}
              className="bg-coral-deep hover:bg-coral-deeper text-white rounded-2xl font-bold py-3 px-6">
              Try again
            </button>
          </div>
        </>
      ) : (
        <>
          {logs.isPending ? (
            <p className="text-muted text-center py-8">Loading…</p>
          ) : total && (
            <div className="space-y-5">
              <KcalRing consumed={total.kcal} goal={goals.kcal} />
              <DayStrip selected={date} today={today} onPick={goTo} />
            </div>
          )}


          {logs.data && logs.data.length === 0 && prevLogs.data && prevLogs.data.length > 0 && (
            <button type="button" onClick={() => copyPrevMutation.mutate()} disabled={copyPrevMutation.isPending}
              className={`w-full py-3 rounded-2xl border-2 border-dashed border-line ${copyPrevMutation.isPending ? 'text-muted' : 'text-link font-semibold hover:bg-coral-light'}`}>
              {copyPrevMutation.isPending
                ? 'Copying…'
                : `Copy ${dayTitle(prev, today).toLowerCase() === 'yesterday' ? 'yesterday' : dayLabel(prev)}'s food (${prevLogs.data.length} item${prevLogs.data.length === 1 ? '' : 's'})`
              }
            </button>
          )}

          {copyPrevMutation.isError && (
            <p className="text-danger text-sm text-center">{copyPrevMutation.error.message}</p>
          )}

          {isToday && <TodayMenu date={date} onLog={(food, meal) => setLogging({ food, meal })} />}

          {groups.map((g) =>
            g.meal === 'snack' && g.logs.length === 0 ? null : (
              <MealSection key={g.meal} meal={g.meal} logs={g.logs} emptyAddHref={isToday ? '/add' : `/add?date=${date}`} />
            )
          )}

          <MacroPills protein={{ value: total?.protein_g ?? 0, goal: goals.protein_g }} carbs={{ value: total?.carbs_g ?? 0, goal: goals.carbs_g }} fat={{ value: total?.fat_g ?? 0, goal: goals.fat_g }} />

          {logs.data && logs.data.length > 0 && <MoreNutrients logs={logs.data} />}
        </>
      )}
    </div>
  )
}
