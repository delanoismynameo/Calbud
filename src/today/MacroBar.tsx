import { progress } from './totals'

export default function MacroBar({ label, value, goal, unit }: {
  label: string
  value: number
  goal: number
  unit: string
}) {
  const pct = progress(value, goal)
  const over = value > goal
  return (
    <div className="min-w-0">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value} / {goal} {unit}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={goal}
        className="h-2 rounded-full bg-slate-700 overflow-hidden"
      >
        <div
          className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
