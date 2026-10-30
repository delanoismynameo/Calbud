import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { useLocalDate } from '../lib/useLocalDate'
import { weekStart, weekDays, weekLabel, dayLabel, addDays } from '../prep/week'
import type { MealPrep } from '../prep/types'
import type { MenuMeal, MenuSlot } from '../menu/types'
import { updatePrep } from '../prep/prepApi'
import { usePrepWeek } from '../prep/usePrepWeek'
import { useMenuWeek } from '../menu/useMenuWeek'
import { slotAt, menuCount } from '../menu/menu'
import PrepForm from '../prep/PrepForm'
import MenuGrid from '../menu/MenuGrid'
import SlotEditor from '../menu/SlotEditor'
import { useProfile } from '../household/useProfile'
import RepeatButton from '../prep/RepeatButton'
import { usePrepRealtime } from '../prep/usePrepRealtime'
import GroceryList from '../prep/GroceryList'
import RecipeList from '../prep/RecipeList'
import ServingPicker from '../food/ServingPicker'
import { foodResultFromRow } from '../food/recents'
import { kcalPerServing } from '../prep/dishFood'

export default function Prep() {
  const today = useLocalDate()
  const [start, setStart] = useState(() => weekStart(today))
  const [editing, setEditing] = useState<{ date: string; prep?: MealPrep } | null>(null)
  const [logging, setLogging] = useState<MealPrep | null>(null)
  const { data, isLoading, error, refetch } = usePrepWeek(start)
  const profile = useProfile()
  usePrepRealtime(profile.profile?.household_id)
  const menu = useMenuWeek(start)
  const [view, setView] = useState<'plan' | 'menu' | 'grocery' | 'recipes'>('menu')
  const [slotEditing, setSlotEditing] = useState<{ date: string; meal: MenuMeal } | null>(null)

  if (editing) {
    return <PrepForm date={editing.date} prep={editing.prep} onClose={() => setEditing(null)} />
  }

  if (logging?.foods) return <ServingPicker food={foodResultFromRow(logging.foods)} onLogged={() => setLogging(null)} onCancel={() => setLogging(null)} />

  if (slotEditing) {
    const filled = (menu.data ?? []).filter(s => s.meal === slotEditing.meal).map(s => s.slot_date)
    return <SlotEditor date={slotEditing.date} meal={slotEditing.meal} slot={slotAt(menu.data ?? [], slotEditing.date, slotEditing.meal)} dishes={data ?? []} filled={filled} takenMeals={(menu.data ?? []).filter(s => s.slot_date === slotEditing.date).map(s => s.meal)} onClose={() => setSlotEditing(null)} />
  }

  const weekStarts = weekStart(today)
  const isFirstWeek = start === weekStarts

  const prevWeek = () => setStart(addDays(start, -7))
  const nextWeek = () => setStart(addDays(start, 7))
  const thisWeek = () => setStart(weekStarts)

  return (
    <div className="bg-cream min-h-screen text-ink">
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <button onClick={prevWeek} aria-label="Previous week"
            className="h-10 w-10 rounded-2xl bg-card shadow-card text-ink">
            ‹
          </button>
          <h1 className="text-lg font-semibold">{weekLabel(start)}</h1>
          <button onClick={nextWeek} aria-label="Next week"
            className="h-10 w-10 rounded-2xl bg-card shadow-card text-ink">
            ›
          </button>
        </div>
        {!isFirstWeek && (
          <button onClick={thisWeek} className="text-sm text-link underline">This week</button>
        )}
      </div>

      <div className="flex mx-3 my-2 bg-coral-light rounded-2xl p-1">
        <button onClick={() => setView('menu')} aria-pressed={view === 'menu'}
          className={`flex-1 py-2 text-sm font-medium ${view === 'menu' ? 'bg-card text-ink shadow-card rounded-xl font-bold' : ''}`}>
          Menu
        </button>
        <button onClick={() => setView('plan')} aria-pressed={view === 'plan'}
          className={`flex-1 py-2 text-sm font-medium ${view === 'plan' ? 'bg-card text-ink shadow-card rounded-xl font-bold' : ''}`}>
          Plan
        </button>
        <button onClick={() => setView('grocery')} aria-pressed={view === 'grocery'}
          className={`flex-1 py-2 text-sm font-medium ${view === 'grocery' ? 'bg-card text-ink shadow-card rounded-xl font-bold' : ''}`}>
          Grocery list
        </button>
        <button onClick={() => setView('recipes')} aria-pressed={view === 'recipes'}
          className={`flex-1 py-2 text-sm font-medium ${view === 'recipes' ? 'bg-card text-ink shadow-card rounded-xl font-bold' : ''}`}>
          Recipes
        </button>
      </div>

      {/* Loading / Error, for the menu or for the prep sessions */}
      {view !== 'recipes' && ((view === 'menu' ? menu.isLoading : isLoading)) && <p className="px-3 py-8 text-center text-muted">Loading…</p>}
      {view === 'menu' && menu.error && !menu.isLoading && (
        <div className="px-3 py-6 text-center space-y-2">
          <p className="text-danger">{menu.error.message}</p>
          <button onClick={() => menu.refetch()} className="text-sm text-link underline">Try again</button>
        </div>
      )}
      {view !== 'menu' && view !== 'recipes' && error && !isLoading && (
        <div className="px-3 py-6 text-center space-y-2">
          <p className="text-danger">{error.message}</p>
          <button onClick={() => refetch()} className="text-sm text-link underline">Try again</button>
        </div>
      )}

      {/* Week data */}
      {view === 'recipes' ? <RecipeList /> : view === 'menu' ? (
        menu.data && !menu.isLoading && !menu.error && (
          <>
            <MenuGrid days={weekDays(start)} today={today} slots={menu.data} onPick={(date, meal) => setSlotEditing({ date, meal })} />
            <p className="text-muted text-xs text-center mt-2">Tap a meal to fill it. Dishes come from this week's prep.</p>
            <RepeatButton kind="menu" start={start} key={start} />
          </>
        )
      ) : (data && !isLoading && !error) ? (
        view === 'grocery' ? (
          <GroceryList sessions={data} weekStart={start} />
        ) : (
          <>
            {data.length === 0 && (
              <p className="px-3 py-6 text-center text-muted">Nothing planned this week. Tap + Add on a day.</p>
            )}

            {weekDays(start).map((day) => {
              const daySessions = data.filter((s) => s.scheduled_date === day)
              return (
                <div key={day}>
                  {/* Day heading */}
                  <div className="px-3 py-2 flex items-center justify-between border-b border-line">
                    <h2 className="text-sm font-medium text-muted flex items-center gap-1">
                      {dayLabel(day)}
                      {day === today && <span className="text-xs text-link ml-1">· Today</span>}
                    </h2>
                    <button onClick={() => setEditing({ date: day })} aria-label={`Add prep on ${dayLabel(day)}`}
                      className="text-xs text-link font-semibold hover:text-coral-deeper">+ Add</button>
                  </div>

                  {/* Sessions */}
                  {daySessions.map((session) => (
                    <div key={session.id} className="px-3 py-2 flex items-center gap-2 bg-card rounded-3xl shadow-card">
                      {/* Main button — title + info */}
                      <button onClick={() => setEditing({ prep: session, date: session.scheduled_date })}
                        className={`flex-1 text-left p-2 rounded-2xl ${session.status === 'done' ? 'line-through opacity-60' : ''}`}>
                        <p className="font-medium">{session.title}</p>
                        <p className="text-xs text-muted mt-0.5">{sessionDetails(session, menu.data ?? [])}</p>
                      </button>

                      {/* Log button */}
                      {session.foods && (
                        <button onClick={() => setLogging(session)} aria-label={'Log a serving of ' + session.title}
                          className="px-2 py-1 text-xs font-semibold rounded bg-coral-deep text-white hover:bg-coral-deeper">
                          Log
                        </button>
                      )}

                      {/* Status toggle */}
                      <ToggleStatus id={session.id} current={session.status} />
                    </div>
                  ))}
                </div>
              )
            })}
            <RepeatButton kind="prep" start={start} key={start} />
          </>
        )
      ) : null}
    </div>
  )
}

function sessionDetails(s: MealPrep, menuSlots: MenuSlot[]): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const kcal = (s.foods != null && kcalPerServing(s.foods) != null) ? `${kcalPerServing(s.foods)} cal each` : null
  const count = menuCount(menuSlots, s.id)
  return [
    s.start_time ? s.start_time.slice(0, 5) : null,
    `${s.duration_min} min`,
    plural(s.servings, 'serving'),
    count > 0 ? `${count} in menu` : null,
    kcal,
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
      className={`px-3 py-1 text-xs font-bold rounded-full disabled:opacity-50 ${
        mutation.isError ? 'text-danger'
          : isDone ? 'bg-green-soft text-green-ink' : 'bg-coral-light text-link'
      }`}>
      {mutation.isError ? 'Try again' : isDone ? 'Done' : 'Planned'}
    </button>
  )
}
