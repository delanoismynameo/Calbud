import { useState } from 'react'
import { sumExtras, cleanExtras, dvPercent } from '../food/extras'
import type { MealLog } from './types'

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

  const rows = logs.length > 0 ? sumExtras(logs.map((l) => cleanExtras(l.extra))) : []

  return (
    <div>
      <button type="button" onClick={toggle} aria-expanded={open}
        className="w-full text-left text-sm text-blue-400">
        More nutrients {open ? '▴' : '▾'}
      </button>
      {open && (
        <>
          <div className="mt-2 space-y-1">
            {rows.map(({ info, total, missing }) => {
              const pct = dvPercent(total, info.dv)
              if (missing === logs.length) {
                return (
                  <div key={info.key} className="flex justify-between text-sm">
                    <span className="text-gray-500">{info.label}</span>
                    <span className="text-gray-500">—</span>
                  </div>
                )
              }
              let label: string
              if (pct !== null) {
                label = `${total} ${info.unit} \u00b7 ${pct}%`
              } else {
                label = `${total} ${info.unit}`
              }
              return (
                <div key={info.key} className="flex justify-between text-sm">
                  <span className="text-gray-500">{info.label}</span>
                  <span>
                    {label}
                    {missing > 0 && <span className="text-xs text-gray-500"> ({missing} without data)</span>}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">% of the daily value on US food labels. Foods logged before this update have no data.</p>
        </>
      )}
    </div>
  )
}
