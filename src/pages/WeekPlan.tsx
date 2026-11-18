import { useState } from 'react'
import { useLocalDate } from '../lib/useLocalDate'
import { weekStart, weekDays, addDays, dayLabel } from '../prep/week'
import { usePrepWeek } from '../prep/usePrepWeek'
import { useActivityWeek } from '../activities/useActivityWeek'
import type { WeekRow } from './weekRows'
import { mealToRow, activityToRow, sortRows, rowIcon, rowLabel } from './weekRows'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Loading() {
  return <p className="text-muted text-sm py-8 text-center">Loading…</p>
}

function ErrorBox({ error }: { error: Error }) {
  return (
    <div className="bg-card rounded-3xl shadow-card p-6 text-center">
      <p className="text-danger font-semibold">Couldn't load this week.</p>
      <p className="text-muted text-sm mt-1">{error.message}</p>
    </div>
  )
}

export default function WeekPlan() {
  const today = useLocalDate()
  const weekStarts = weekStart(today)
  const [start, setStart] = useState(() => weekStarts)
  const [selected, setSelected] = useState<string>(() =>
    weekDays(weekStarts).includes(today) ? today : weekDays(weekStarts)[0]
  )

  const prep = usePrepWeek(start)
  const activities = useActivityWeek(start)

  const weekRows = (prep.data ?? []).map(mealToRow)
  const actRows = (activities.data ?? []).map(activityToRow)
  const allRows = [...weekRows, ...actRows]

  const weekStartsNow = weekStarts
  const isFirstWeek = start === weekStartsNow
  const prevWeek = () => setStart(addDays(start, -7))
  const nextWeek = () => setStart(addDays(start, 7))
  const thisWeek = () => { setStart(weekStartsNow); setSelected(today) }

  const selectedRows = sortRows(allRows.filter(r => r.scheduled_date === selected))

  return (
    <div className="bg-card rounded-3xl shadow-card p-5 text-left">
      {/* Header nav */}
      <div className="flex items-center justify-between mb-1">
        <button type="button" aria-label="Previous week"
          onClick={prevWeek}
          className="h-9 w-9 flex items-center justify-center rounded-2xl bg-cream border border-line text-lg font-semibold hover:bg-coral-light">‹</button>
        <h3 className="text-base font-bold text-ink">{weekLabel(start)}</h3>
        <button type="button" aria-label="Next week"
          onClick={nextWeek}
          className="h-9 w-9 flex items-center justify-center rounded-2xl bg-cream border border-line text-lg font-semibold hover:bg-coral-light">›</button>
      </div>
      {!isFirstWeek && (
        <div className="text-right mb-2">
          <button type="button" onClick={thisWeek} className="text-xs text-link font-semibold underline">This week</button>
        </div>
      )}

      {/* Day strip */}
      <div className="flex justify-between my-4">
        {weekDays(start).map((day) => {
          const days = allRows.filter(r => r.scheduled_date === day)
          const dots = days.length > 0
          const type = days[days.length - 1]?.type
          const color = type === 'meal' ? '#ff6f7d' : type === 'work' ? '#b8a0ff' : undefined
          const [dy, dm, dd] = day.split('-').map(Number) as [number, number, number]
          const dow = new Date(dy, dm - 1, dd).getDay()
          const dom = dd
          return (
            <button key={day} type="button" onClick={() => setSelected(day)}
              aria-label={day} aria-current={day === selected}
              className={`flex h-14 w-[46px] flex-col items-center justify-center gap-1 rounded-2xl border border-line ${day === selected ? 'bg-coral-light' : 'bg-cream'}`}>
              <span className="text-[10px] font-medium uppercase text-muted">{DOW[dow]}</span>
              <span className={`text-base font-bold ${day === selected ? 'text-coral-deep' : 'text-ink'}`}>{dom}</span>
              <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: dots ? color : 'transparent' }} />
            </button>
          )
        })}
      </div>

      {/* Selected day heading */}
      <p className="text-xs font-semibold uppercase tracking-[1.5px] text-section mb-3">{dayLabel(selected)}</p>

      {/* Loading / Error */}
      {(prep.isPending || activities.isPending) && <Loading />}
      {(prep.isError || activities.isError) && !prep.isPending && !activities.isPending && (
        <ErrorBox error={(prep.isError ? prep.error : activities.error) ?? new Error('Unknown error')} />
      )}

      {/* Empty state */}
      {allRows.length > 0 && !prep.isPending && !activities.isPending && selectedRows.length === 0 && (
        <p className="text-muted text-sm py-6 text-center">Nothing planned for {dayLabel(selected)}.</p>
      )}

      {/* Cards */}
      {selectedRows.map((row) => (
        <div key={`${row.type}:${row.id}`}
          className={`flex items-center gap-3 rounded-2xl border-l-4 p-3 mb-2 ${row.type === 'meal' ? 'bg-coral-light/30 border-coral-deep' : 'bg-[#b8a0ff]/20 border-[#b8a0ff]'}`}>
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${row.type === 'meal' ? 'bg-coral-light' : 'bg-[#b8a0ff]/30'}`}>
            {rowIcon[row.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink truncate">{row.title}</p>
            <p className="text-xs text-muted mt-0.5">{row.detail}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${row.type === 'meal' ? 'bg-coral-light text-coral-deep' : 'bg-[#b8a0ff]/30 text-[#7a5fe0]'}`}>
            {rowLabel[row.type]}
          </span>
        </div>
      ))}
    </div>
  )
}

function weekLabel(start: string): string {
  const [sy, sm, sd] = start.split('-').map(Number) as [number, number, number]
  const eDate = new Date(sy, sm - 1, sd + 6)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MONTHS[sm - 1]} ${sd} – ${MONTHS[eDate.getMonth()]} ${eDate.getDate()}`
}
