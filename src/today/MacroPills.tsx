import { progress } from './totals'

interface MacroTileProps {
  emoji: string
  label: string
  value: number
  goal: number
  bgColor: string
  textColor: string
}

function MacroTile({ emoji, label, value, goal, bgColor, textColor }: MacroTileProps) {
  const pct = progress(value, goal)
  const over = value > goal && goal > 0
  const roundedValue = Math.round(value)
  return (
    <div className={`flex flex-col items-center justify-center gap-1 rounded-3xl shadow-card px-2 py-4 min-h-24 ${bgColor}`}>
      <div className={`text-base font-extrabold ${over ? 'text-warn' : textColor}`}>
        {emoji} {roundedValue}g
      </div>
      <div className="text-[11px] font-semibold uppercase text-muted">
        {label}
      </div>
      {goal > 0 && (
        <>
          <div className="text-[11px] text-muted">
            of {goal}g
          </div>
          <div
            role="progressbar"
            aria-label={label}
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={goal}
            className="h-1.5 w-full rounded-full bg-ring-track overflow-hidden"
          >
            <div
              className={`h-full rounded-full ${over ? 'bg-warn' : 'bg-ring'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}

interface MacroPillsProps {
  protein: { value: number; goal: number }
  carbs: { value: number; goal: number }
  fat: { value: number; goal: number }
}

export default function MacroPills({ protein, carbs, fat }: MacroPillsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 my-2">
      <MacroTile
        emoji="🥩"
        label="Protein"
        value={protein.value}
        goal={protein.goal}
        bgColor="bg-rose-soft"
        textColor="text-rose-ink"
      />
      <MacroTile
        emoji="🍞"
        label="Carbs"
        value={carbs.value}
        goal={carbs.goal}
        bgColor="bg-amber-soft"
        textColor="text-amber-ink"
      />
      <MacroTile
        emoji="🥑"
        label="Fat"
        value={fat.value}
        goal={fat.goal}
        bgColor="bg-green-soft"
        textColor="text-green-ink"
      />
    </div>
  )
}
