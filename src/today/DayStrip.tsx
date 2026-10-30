import { stripDays } from './stripDays'

export default function DayStrip({ selected, today, onPick }: { selected: string; today: string; onPick: (date: string) => void }) {
  const days = stripDays(selected, today)

  return (
    <div className="flex justify-between px-1 my-4">
      {days.map(day => {
        const isSelected = day.isSelected
        const isFuture = day.isFuture
        return (
          <button
            key={day.date}
            type="button"
            disabled={isFuture}
            aria-label={day.date}
            {...(isSelected ? { 'aria-current': 'date' } : {})}
            className={[
              'flex h-16 w-[52px] flex-col items-center justify-center gap-1 rounded-2xl',
              isSelected ? 'bg-coral-light' : undefined,
              isFuture ? 'opacity-40' : undefined,
            ].filter(Boolean).join(' ')}
            onClick={() => onPick(day.date)}
          >
            <span className={[
              'text-[11px] font-medium uppercase',
              isSelected ? 'text-link' : 'text-muted',
            ].filter(Boolean).join(' ')}>
              {day.dow}
            </span>
            <span className={isSelected ? 'text-base font-bold text-link' : 'text-base font-bold text-ink'}>
              {day.dom}
            </span>
          </button>
        )
      })}
    </div>
  )
}
