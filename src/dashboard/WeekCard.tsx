import { useProfile } from '../household/useProfile'
import { useLocalDate } from '../lib/useLocalDate'
import { useHouseholdKcal } from './useHouseholdKcal'
import { averageKcal, lastWeek, streak } from './stats'
import { streakText } from './streakText'

export default function WeekCard() {
  const profile = useProfile().profile
  if (!profile) return null

  const today = useLocalDate()
  const kcalQuery = useHouseholdKcal(today)

  if (kcalQuery.isLoading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 text-left space-y-3">
        <h2 className="text-sm font-semibold text-gray-400">This week</h2>
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (kcalQuery.isError) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 text-left space-y-3">
        <h2 className="text-sm font-semibold text-gray-400">This week</h2>
        <p className="text-red-400 text-sm">{kcalQuery.error.message}</p>
      </div>
    )
  }

  const data = kcalQuery.data!
  const people: Array<{ id: string; display_name: string; color: string; goal_calories: number }> = [
    { id: profile.id, display_name: profile.display_name, color: profile.color, goal_calories: profile.goal_calories },
  ]
  const partner = useProfile().partner
  if (partner) {
    people.push({
      id: partner.id,
      display_name: partner.display_name,
      color: partner.color,
      goal_calories: partner.goal_calories,
    })
  }

  const weekDates = lastWeek(today)

  return (
    <div className="bg-slate-800 rounded-lg p-4 text-left space-y-3">
      <h2 className="text-sm font-semibold text-gray-400">This week</h2>

      {people.map((person) => {
        const kcalToday = data[person.id]?.[today] ?? 0
        const avg = averageKcal(data[person.id], weekDates)
        const avgText = avg !== null ? `${avg} cal` : 'No food logged this week'

        return (
          <div key={person.id}>
            <p>
              <span className="w-3 h-3 rounded-full inline-block mr-2" style={{ backgroundColor: person.color }} />
              <span className="font-semibold">{person.display_name}</span>
            </p>
            <p className="text-sm">Today: {kcalToday} / {person.goal_calories} cal</p>
            <p className="text-sm text-gray-400">7-day average: {avgText}</p>
          </div>
        )
      })}

      <p className="text-sm">{streakText(streak(people.map((p) => ({ byDay: data[p.id], goal: p.goal_calories })), today, 60), people.length > 1)}</p>
    </div>
  )
}
