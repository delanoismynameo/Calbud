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
    <div className="bg-card rounded-3xl shadow-card p-3 grid grid-cols-[3rem_1fr_1fr_1fr] gap-1">
      {/* Header row */}
      <div />
      {MENU_MEALS.map(m => (
        <div key={m} className="text-xs text-muted font-semibold tracking-wide">{mealLabel(m)}</div>
      ))}

      {/* Rows per day */}
      {days.map(day => (
        <Fragment key={day}>
          {/* Day cell */}
          <div className={
            `text-[11px] font-semibold uppercase text-muted ${
              day === today ? 'text-link underline decoration-2 underline-offset-2' : ''
            }`
          }>
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
                className={`min-h-[3.5rem] rounded-2xl bg-coral-light/50 text-ink p-1 text-xs font-semibold hover:bg-coral-light transition-colors ${!slot ? 'border-2 border-dashed border-line text-muted' : ''}`}
              >
                {slot ? (
                  <span className={`line-clamp-3 ${slot.prep_id ? 'text-link' : ''}`}>
                    {slot.label}
                  </span>
                ) : (
                  <span className="flex items-center justify-center h-full">+</span>
                )}
              </button>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
