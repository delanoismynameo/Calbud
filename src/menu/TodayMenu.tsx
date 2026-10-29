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
    <div className="bg-slate-800 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Today's menu</p>
        <Link to="/prep" className="text-sm text-blue-400">Edit</Link>
      </div>

      {MENU_MEALS.map(meal => {
        const slot = slotAt(data, date, meal)
        return (
          <div key={meal} className="flex items-center gap-2">
            <div className="w-20 text-xs text-gray-500">{mealLabel(meal)}</div>
            <div className="flex-1 text-sm text-white">
              {slot ? slot.label : <span className="text-gray-500">—</span>}
            </div>
            {slot?.meal_prep?.foods && (
              <button
                onClick={() => onLog(foodResultFromRow(slot.meal_prep!.foods!), meal)}
                aria-label={'Log ' + slot.label + ' for ' + mealLabel(meal)}
                className="px-2 py-1 text-xs font-semibold rounded bg-blue-600 text-white"
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
