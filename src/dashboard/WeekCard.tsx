import { useProfile } from '../household/useProfile'
import { useLocalDate } from '../lib/useLocalDate'
import { useHouseholdKcal } from './useHouseholdKcal'
import { averageKcal, lastWeek, streak } from './stats'
import { streakText } from './streakText'

export default function WeekCard() {
  const { profile, partner } = useProfile()
  const today = useLocalDate()
  const kcal = useHouseholdKcal(today)

  if (!profile) return null

  const people = partner ? [profile, partner] : [profile]
  let body
  if (kcal.isPending) {
    body = <p className="text-gray-400 text-sm">Loading…</p>
  } else if (kcal.isError) {
    body = <p className="text-red-400 text-sm">{kcal.error.message}</p>
  } else {
    const data = kcal.data
    const week = lastWeek(today)
    const n = streak(people.map((p) => ({ byDay: data[p.id], goal: p.goal_calories })), today, 60)
    body = (
      <>
        {people.map((p) => {
          const avg = averageKcal(data[p.id], week)
          return (
            <div key={p.id}>
              <p>
                <span className="w-3 h-3 rounded-full inline-block mr-2" style={{ backgroundColor: p.color }} />
                <span className="font-semibold">{p.display_name}</span>
              </p>
              <p className="text-sm">Today: {data[p.id]?.[today] ?? 0} / {p.goal_calories} cal</p>
              <p className="text-sm text-gray-400">{avg !== null ? `7-day average: ${avg} cal` : 'No food logged this week'}</p>
            </div>
          )
        })}
        <p className="text-sm">{streakText(n, people.length > 1)}</p>
      </>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 text-left space-y-3">
      <h2 className="text-sm font-semibold text-gray-400">This week</h2>
      {body}
    </div>
  )
}
