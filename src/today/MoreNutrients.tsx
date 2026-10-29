import { useState } from 'react'
import type { MealLog } from './types'
import { dayNutrition, foodCount } from './dayNutrition'
import NutritionLabel from '../food/NutritionLabel'

export default function MoreNutrients({ logs }: { logs: MealLog[] }) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('calbud:more-nutrients') === '1'
    } catch {
      return false
    }
  })

  const toggle = () => {
    try {
      localStorage.setItem('calbud:more-nutrients', open ? '0' : '1')
    } catch {
      // ignore
    }
    setOpen(!open)
  }

  const day = dayNutrition(logs)

  return (
    <div>
      <button type="button" onClick={toggle} aria-expanded={open}
        className="w-full text-left text-sm text-blue-400">
        Nutrition facts {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-2"><NutritionLabel servingName="Logged" servingText={foodCount(logs.length)} kcal={day.kcal} rows={day.rows} note="Foods logged before nutrients were added have no data." /></div>
      )}
    </div>
  )
}
