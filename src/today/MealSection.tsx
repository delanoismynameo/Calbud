import { useState } from 'react'
import { Link } from 'react-router'
import type { MealType, MealLog } from './types'
import EditMealLog from './EditMealLog'
import { sumLogs } from './totals'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
}

export default function MealSection({ meal, logs, emptyAddHref }: {
  meal: MealType
  logs: MealLog[]
  emptyAddHref?: string
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <section className="space-y-3">
      <div className="flex justify-between items-baseline">
        <h2 className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">{MEAL_LABELS[meal]}</h2>
        <span className="text-muted text-sm ml-auto">
          {sumLogs(logs).kcal} cal
        </span>
      </div>

      {logs.length === 0 ? (
        emptyAddHref ? (
          <Link to={emptyAddHref} className="flex h-[72px] items-center justify-center rounded-3xl border-2 border-dashed border-line text-muted font-semibold">+ Add food</Link>
        ) : (
          <p className="text-muted text-sm">Nothing logged.</p>
        )
      ) : (
        logs.map((log) =>
          editingId === log.id ? (
            <EditMealLog key={log.id} log={log} onClose={() => setEditingId(null)} />
          ) : (
            <button
              key={log.id} type="button"
              onClick={() => setEditingId(log.id)}
              className="w-full text-left bg-card rounded-3xl shadow-card p-4 flex items-center gap-3.5 hover:bg-coral-light"
            >
              <div aria-hidden className="h-14 w-14 shrink-0 rounded-2xl bg-coral-light flex items-center justify-center text-2xl">
                {MEAL_ICONS[meal]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-base text-ink truncate">{log.name}</p>
                <p className="text-[13px] text-muted">{log.quantity_g} g</p>
              </div>
              <span className="rounded-xl bg-coral-light px-2.5 py-1.5 text-[15px] font-extrabold text-link whitespace-nowrap">{Math.round(log.kcal)} cal</span>
            </button>
          )
        )
      )}
    </section>
  )
}
