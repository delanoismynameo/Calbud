import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { useLocalDate } from '../lib/useLocalDate'
import { weekStart, weekDays, weekLabel, dayLabel, addDays } from '../prep/week'
import type { MealPrep } from '../prep/types'
import { updatePrep } from '../prep/prepApi'
import { usePrepWeek } from '../prep/usePrepWeek'
import PrepForm from '../prep/PrepForm'
import { useProfile } from '../household/useProfile'
import { usePrepRealtime } from '../prep/usePrepRealtime'
import GroceryList from '../prep/GroceryList'

export default function Prep() {
  const today = useLocalDate()
  const [start, setStart] = useState(() => weekStart(today))
  const [editing, setEditing] = useState<{ date: string; prep?: MealPrep } | null>(null)
  const { data, isLoading, error, refetch } = usePrepWeek(start)
  const profile = useProfile()
  usePrepRealtime(profile.profile?.household_id)
  const [view, setView] = useState<'plan' | 'grocery'>('plan')

  if (editing) {
    return <PrepForm date={editing.date} prep={editing.prep} onClose={() => setEditing(null)} />
  }

  const weekStarts = weekStart(today)
  const isFirstWeek = start === weekStarts

  const prevWeek = () => setStart(addDays(start, -7))
  const nextWeek = () => setStart(addDays(start, 7))
  const thisWeek = () => setStart(weekStarts)

  return (
    <div className="bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <button onClick={prevWeek} aria-label="Previous week"
            className="w-9 h-9 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700">
            ‹
          </button>
          <h1 className="text-lg font-semibold">{weekLabel(start)}</h1>
          <button onClick={nextWeek} aria-label="Next week"
            className="w-9 h-9 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700">
            ›
          </button>
        </div>
        {!isFirstWeek && (
          <button onClick={thisWeek} className="text-sm text-blue-400 underline">This week</button>
        )}
      </div>

      {/* Plan / Grocery list switch */}
      <div className="flex mx-3 my-2 rounded overflow-hidden">
        <button onClick={() => setView('plan')} aria-pressed={view === 'plan'}
          className={`flex-1 py-2 text-sm font-medium ${view === 'plan' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-300'}`}>
          Plan
        </button>
        <button onClick={() => setView('grocery')} aria-pressed={view === 'grocery'}
          className={`flex-1 py-2 text-sm font-medium ${view === 'grocery' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-300'}`}>
          Grocery list
        </button>
      </div>

      {/* Loading / Error */}
      {isLoading && <p className="px-3 py-8 text-center text-gray-500">Loading…</p>}
      {error && !isLoading && (
        <div className="px-3 py-6 text-center space-y-2">
          <p className="text-red-400">{error.message}</p>
          <button onClick={() => refetch()} className="text-sm text-blue-400 underline">Try again</button>
        </div>
      )}

      {/* Week data */}
      {data && !isLoading && !error && (view === 'grocery' ? (
        <GroceryList sessions={data} weekStart={start} />
      ) : (
        <>
          {data.length === 0 && (
            <p className="px-3 py-6 text-center text-gray-500">Nothing planned this week. Tap + Add on a day.</p>
          )}

          {weekDays(start).map((day) => {
            const daySessions = data.filter((s) => s.scheduled_date === day)
            return (
              <div key={day}>
                {/* Day heading */}
                <div className="px-3 py-2 flex items-center justify-between border-b border-slate-700">
                  <h2 className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    {dayLabel(day)}
                    {day === today && <span className="text-xs text-blue-400 ml-1">· Today</span>}
                  </h2>
                  <button onClick={() => setEditing({ date: day })} aria-label={`Add prep on ${dayLabel(day)}`}
                    className="text-xs text-blue-400 font-semibold hover:text-blue-300">+ Add</button>
                </div>

                {/* Sessions */}
                {daySessions.map((session) => (
                  <div key={session.id}
                    className={`px-3 py-2 flex items-center gap-2 ${
                      session.status === 'done' ? 'bg-slate-800/50' : ''
                    }`}>
                    {/* Main button — title + info */}
                    <button onClick={() => setEditing({ prep: session, date: session.scheduled_date })}
                      className={`flex-1 text-left p-2 rounded ${session.status === 'done' ? 'line-through opacity-60' : ''}`}>
                      <p className="font-medium">{session.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sessionDetails(session)}</p>
                    </button>

                    {/* Status toggle */}
                    <ToggleStatus id={session.id} current={session.status} />
                  </div>
                ))}
              </div>
            )
          })}
        </>
      ))}
    </div>
  )
}

function sessionDetails(s: MealPrep): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return [
    s.start_time ? s.start_time.slice(0, 5) : null,
    `${s.duration_min} min`,
    plural(s.servings, 'serving'),
    s.ingredients.length > 0 ? plural(s.ingredients.length, 'ingredient') : null,
  ].filter(Boolean).join(' · ')
}

function ToggleStatus({ id, current }: { id: string; current: 'planned' | 'done' }) {
  const other = current === 'planned' ? ('done' as const) : ('planned' as const)
  const mutation = useMutation({
    mutationFn: () => updatePrep(id, { status: other }),
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['meal-prep'] }),
  })

  const isDone = current === 'done'
  return (
    <button onClick={() => mutation.mutate()} aria-pressed={isDone} disabled={mutation.isPending}
      className={`px-2 py-1 text-xs font-semibold rounded disabled:opacity-50 ${
        mutation.isError ? 'bg-red-700 text-white'
          : isDone ? 'bg-green-600 text-white' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
      }`}>
      {mutation.isError ? 'Try again' : isDone ? 'Done' : 'Planned'}
    </button>
  )
}
