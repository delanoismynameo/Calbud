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
import MacroBar from '../today/MacroBar'
import MoreNutrients from '../today/MoreNutrients'
import MealSection from '../today/MealSection'
import TodayMenu from '../menu/TodayMenu'
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous day" onClick={() => goTo(addDays(date, -1))}
          className="w-9 h-9 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold">‹</button>
        <h1 className="text-lg font-semibold">{dayTitle(date, today)}</h1>
        <button type="button" aria-label="Next day" onClick={() => goTo(addDays(date, 1))} disabled={isToday}
          className={`w-9 h-9 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold ${isToday ? 'opacity-30 disabled:cursor-not-allowed' : ''}`}>›</button>
      </div>

      {!isToday && (
        <button type="button" onClick={() => goTo(today)}
          className="text-sm text-blue-400 underline">Back to today</button>
      )}

      {logs.isError ? (
        <>
          <div className="bg-slate-800 rounded-lg p-6 text-center space-y-3">
            <p className="text-red-400 font-semibold">Couldn't load {isToday ? "today's" : "this day's"} food.</p>
            <p className="text-gray-500 text-sm">{logs.error.message}</p>
            <button
              type="button"
              onClick={() => logs.refetch()}
              className="py-3 px-6 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
          <Link to={isToday ? '/add' : `/add?date=${date}`} className="block w-full py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold text-lg text-center">
            Add food
          </Link>
        </>
      ) : (
        <>
          {logs.isPending ? (
            <p className="text-gray-400 text-center py-8">Loading…</p>
          ) : total && (
            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
              <p className="text-center text-3xl font-bold text-white">
                {total.kcal} / {goals.kcal} cal
              </p>
              {(() => {
                const remaining = goals.kcal - total.kcal
                return (
                  <p className={`text-center text-lg ${remaining >= 0 ? 'text-gray-400' : 'text-amber-500'}`}>
                    {remaining >= 0 ? `${remaining} cal left` : `${Math.abs(remaining)} cal over`}
                  </p>
                )
              })()}

              <div className="space-y-3">
                <MacroBar label="Protein" value={total.protein_g} goal={goals.protein_g} unit="g" />
                <MacroBar label="Carbs" value={total.carbs_g} goal={goals.carbs_g} unit="g" />
                <MacroBar label="Fat" value={total.fat_g} goal={goals.fat_g} unit="g" />
              </div>
              {logs.data && logs.data.length > 0 && <MoreNutrients logs={logs.data} />}
            </div>
          )}

          <Link to={isToday ? '/add' : `/add?date=${date}`} className="block w-full py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold text-lg text-center">
            Add food
          </Link>

          {logs.data && logs.data.length === 0 && prevLogs.data && prevLogs.data.length > 0 && (
            <button type="button" onClick={() => copyPrevMutation.mutate()} disabled={copyPrevMutation.isPending}
              className={`w-full py-2 rounded border border-dashed border-slate-600 ${copyPrevMutation.isPending ? 'text-gray-500' : 'text-gray-300 hover:bg-slate-800'}`}>
              {copyPrevMutation.isPending
                ? 'Copying…'
                : `Copy ${dayTitle(prev, today).toLowerCase() === 'yesterday' ? 'yesterday' : dayLabel(prev)}'s food (${prevLogs.data.length} item${prevLogs.data.length === 1 ? '' : 's'})`
              }
            </button>
          )}

          {copyPrevMutation.isError && (
            <p className="text-red-400 text-sm text-center">{copyPrevMutation.error.message}</p>
          )}

          {isToday && <TodayMenu date={date} onLog={(food, meal) => setLogging({ food, meal })} />}

          {groups.map((g) => (
            <MealSection key={g.meal} meal={g.meal} logs={g.logs} />
          ))}
        </>
      )}
    </div>
  )
}
