import { Link } from 'react-router'
import { useMenuWeek } from './useMenuWeek'
import { weekStart } from '../prep/week'
import { MENU_MEALS, type MenuMeal } from './types'
import type { FoodResult } from '../food/types'
import { mealLabel, slotAt } from './menu'
import { foodResultFromRow } from '../food/recents'

export default function TodayMenu({ date, onLog }: {
  date: string
  onLog: (food: FoodResult, meal: MenuMeal) => void
}) {
  const { data } = useMenuWeek(weekStart(date))
  if (!data) return null

  const todays = data.filter(s => s.slot_date === date)
  if (todays.length === 0) return null

  return (
    <div className="bg-cream p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">Today's menu</p>
        <Link to="/prep" className="text-sm text-link underline">Edit</Link>
      </div>

      {MENU_MEALS.map(meal => {
        const slot = slotAt(data, date, meal)
        return (
          <div key={meal} className="bg-card rounded-3xl shadow-card p-4 flex items-center justify-between gap-3">
            <div className="w-20 text-xs text-muted">{mealLabel(meal)}</div>
            <div className="flex-1 text-sm text-ink">
              {slot ? slot.label : <span className="text-muted">—</span>}
            </div>
            {slot?.meal_prep?.foods && (
              <button
                onClick={() => onLog(foodResultFromRow(slot.meal_prep!.foods!), meal)}
                aria-label={'Log ' + slot.label + ' for ' + mealLabel(meal)}
                className="bg-coral-light text-link rounded-2xl font-semibold px-4 py-2"
              >
                Log
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
