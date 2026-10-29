import { Fragment } from 'react'
import { MENU_MEALS, type MenuMeal, type MenuSlot } from './types'
import { mealLabel, slotAt } from './menu'
import { dayLabel } from '../prep/week'

export default function MenuGrid({ days, today, slots, onPick }: {
  days: string[]
  today: string
  slots: MenuSlot[]
  onPick: (date: string, meal: MenuMeal) => void
}) {
  return (
    <div className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-1 px-3">
      {/* Header row */}
      <div />
      {MENU_MEALS.map(m => (
        <div key={m} className="text-xs text-gray-500">{mealLabel(m)}</div>
      ))}

      {/* Rows per day */}
      {days.map(day => (
        <Fragment key={day}>
          {/* Day cell */}
          <div className={`text-sm ${day === today ? 'text-blue-400' : 'text-gray-500'}`}>
            <div>{dayLabel(day).slice(0, 3)}</div>
            <div>{Number(day.slice(8))}</div>
          </div>

          {/* Meal buttons */}
          {MENU_MEALS.map(meal => {
            const slot = slotAt(slots, day, meal)
            return (
              <button
                key={meal}
                onClick={() => onPick(day, meal)}
                aria-label={`${dayLabel(day)}, ${mealLabel(meal)}: ${slot ? slot.label : 'empty'}`}
                className="min-h-[3.5rem] rounded bg-slate-800 hover:bg-slate-700 p-1 text-xs text-left break-words"
              >
                {slot ? (
                  <span className={`line-clamp-3 ${slot.prep_id ? 'text-blue-300' : 'text-white'}`}>
                    {slot.label}
                  </span>
                ) : (
                  <span className="flex items-center justify-center h-full text-gray-500">+</span>
                )}
              </button>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
