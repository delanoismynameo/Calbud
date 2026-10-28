import { useState } from 'react'
import type { MealType, MealLog } from './types'
import EditMealLog from './EditMealLog'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

function truncate(text: string, max = 24): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1) + '…'
}

export default function MealSection({ meal, logs }: {
  meal: MealType
  logs: MealLog[]
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-baseline">
        <h2 className="text-lg font-semibold capitalize">{MEAL_LABELS[meal]}</h2>
        <span className="text-gray-400 text-sm">
          {logs.reduce((s, l) => s + l.kcal, 0)} kcal
        </span>
      </div>

      {logs.length === 0 ? (
        <p className="text-gray-500 text-sm">Nothing logged.</p>
      ) : (
        logs.map((log) =>
          editingId === log.id ? (
            <EditMealLog key={log.id} log={log} onClose={() => setEditingId(null)} />
          ) : (
            <button
              key={log.id} type="button"
              onClick={() => setEditingId(log.id)}
              className="w-full text-left py-3 px-3 bg-slate-800 hover:bg-slate-750 rounded flex justify-between items-center gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-white truncate">{truncate(log.name)}</p>
                <p className="text-gray-400 text-sm">{log.quantity_g} g</p>
              </div>
              <span className="text-white font-medium whitespace-nowrap">{Math.round(log.kcal)} kcal</span>
            </button>
          )
        )
      )}
    </div>
  )
}
