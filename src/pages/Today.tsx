import { Link } from 'react-router'
import { useLocalDate } from '../lib/useLocalDate'
import { useMealLogs } from '../today/useMealLogs'
import { useProfile } from '../household/useProfile'
import { sumLogs, groupByMeal } from '../today/totals'
import MacroBar from '../today/MacroBar'
import MealSection from '../today/MealSection'

export default function Today() {
  const date = useLocalDate()
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

  return (
    <div className="space-y-4">
      {logs.isError ? (
        <>
          <div className="bg-slate-800 rounded-lg p-6 text-center space-y-3">
            <p className="text-red-400 font-semibold">Couldn't load today's food.</p>
            <p className="text-gray-500 text-sm">{logs.error.message}</p>
            <button
              type="button"
              onClick={() => logs.refetch()}
              className="py-3 px-6 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
          <Link to="/add" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold text-lg text-center">
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
                {total.kcal} / {goals.kcal} kcal
              </p>
              {(() => {
                const remaining = goals.kcal - total.kcal
                return (
                  <p className={`text-center text-lg ${remaining >= 0 ? 'text-gray-400' : 'text-amber-500'}`}>
                    {remaining >= 0 ? `${remaining} kcal left` : `${Math.abs(remaining)} kcal over`}
                  </p>
                )
              })()}

              <div className="space-y-3">
                <MacroBar label="Protein" value={total.protein_g} goal={goals.protein_g} unit="g" />
                <MacroBar label="Carbs" value={total.carbs_g} goal={goals.carbs_g} unit="g" />
                <MacroBar label="Fat" value={total.fat_g} goal={goals.fat_g} unit="g" />
              </div>
            </div>
          )}

          <Link to="/add" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold text-lg text-center">
            Add food
          </Link>

          {groups.map((g) => (
            <MealSection key={g.meal} meal={g.meal} logs={g.logs} />
          ))}
        </>
      )}
    </div>
  )
}
