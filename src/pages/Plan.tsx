import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { useLocalDate } from '../lib/useLocalDate'
import { weekStart, weekDays, weekLabel, dayLabel, addDays } from '../prep/week'
import type { Activity } from '../activities/types'
import { sortDay, visibleActivities, activityDetails } from '../activities/activities'
import { updateActivity } from '../activities/activitiesApi'
import { useActivityWeek } from '../activities/useActivityWeek'
import { useActivityRealtime } from '../activities/useActivityRealtime'
import ActivityForm from '../activities/ActivityForm'
import { useProfile } from '../household/useProfile'
import ExportButton from '../activities/ExportButton'

function LoadingRow() {
  return <p className="px-3 py-8 text-center text-muted">Loading…</p>
}

function ErrorBox({ error, onTryAgain }: { error: Error; onTryAgain: () => void }) {
  return (
    <div className="px-3 py-6 text-center space-y-2">
      <p className="text-danger">{error.message}</p>
      <button onClick={onTryAgain} className="text-sm text-link underline">Try again</button>
    </div>
  )
}

export default function Plan() {
  const today = useLocalDate()
  const [start, setStart] = useState(() => weekStart(today))
  const [visibility, setVisibility] = useState<'mine' | 'both'>('both')
  const [editing, setEditing] = useState<{ date: string; activity?: Activity } | null>(null)

  const { data, isLoading, error, refetch } = useActivityWeek(start)
  const profile = useProfile()
  useActivityRealtime(profile.profile?.household_id)

  if (editing) {
    return <ActivityForm activity={editing.activity} date={editing.date} onClose={() => setEditing(null)} />
  }

  const weekStarts = weekStart(today)
  const isFirstWeek = start === weekStarts

  const prevWeek = () => setStart(addDays(start, -7))
  const nextWeek = () => setStart(addDays(start, 7))
  const thisWeek = () => setStart(weekStarts)

  const visible = profile.profile ? visibleActivities(data ?? [], visibility, profile.profile.id) : (data ?? [])

  const showToggle = profile.partner != null

  return (
    <div className="bg-cream min-h-screen text-ink">
      {/* Header */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <button onClick={prevWeek} aria-label="Previous week"
            className="h-10 w-10 flex items-center justify-center rounded-2xl bg-card shadow-card hover:bg-coral-light">
            ‹
          </button>
          <h1 className="text-lg font-semibold">{weekLabel(start)}</h1>
          <button onClick={nextWeek} aria-label="Next week"
            className="h-10 w-10 flex items-center justify-center rounded-2xl bg-card shadow-card hover:bg-coral-light">
            ›
          </button>
        </div>
        {!isFirstWeek && (
          <button onClick={thisWeek} className="text-sm text-link underline">This week</button>
        )}
      </div>

      {/* Toggle */}
      {showToggle && (
        <div className="flex mx-3 my-2 rounded overflow-hidden">
          <button onClick={() => setVisibility('mine')} aria-pressed={visibility === 'mine'}
            className={`flex-1 py-2 text-sm font-semibold ${visibility === 'mine' ? 'bg-coral-deep text-white rounded-full' : 'bg-card text-muted rounded-full'}`}>
            Me
          </button>
          <button onClick={() => setVisibility('both')} aria-pressed={visibility === 'both'}
            className={`flex-1 py-2 text-sm font-semibold ${visibility === 'both' ? 'bg-coral-deep text-white rounded-full' : 'bg-card text-muted rounded-full'}`}>
            Both
          </button>
        </div>
      )}

      {/* Loading / Error */}
      {isLoading && <LoadingRow />}
      {error && !isLoading && (
        <ErrorBox error={error} onTryAgain={() => refetch()} />
      )}

      {/* Week data */}
      {data && !isLoading && !error && (
        <>
          {visible.length === 0 && (
            <p className="px-3 py-6 text-center text-muted">Nothing planned this week. Tap + Add on a day.</p>
          )}

          {weekDays(start).map((day) => {
            const dayActivities = sortDay(visible.filter(a => a.scheduled_date === day))
            return (
              <div key={day} className="rounded-3xl bg-card shadow-card overflow-hidden">
                {/* Day heading */}
                <div className="px-3 py-2 flex items-center justify-between border-b border-line">
                  <h2 className="text-sm font-medium text-muted flex items-center gap-1">
                    {dayLabel(day)}
                    {day === today && <span className="text-xs text-link ml-1">Â· Today</span>}
                  </h2>
                  <button onClick={() => setEditing({ date: day })} aria-label={`Add activity on ${dayLabel(day)}`}
                    className="text-xs text-link font-semibold hover:text-coral-deeper">+ Add</button>
                </div>

                {dayActivities.map((a) => {
                  const isMine = profile.profile && a.user_id === profile.profile.id
                  const isPartner = profile.partner && !isMine

                  // Find the owner's info
                  let ownerName = ''
                  let ownerColor = '#888'
                  if (isMine) {
                    ownerName = profile.profile!.display_name
                    ownerColor = profile.profile!.color
                  } else if (isPartner) {
                    ownerName = profile.partner!.display_name
                    ownerColor = profile.partner!.color
                  }

                  return (
                    <div key={a.id} className="px-3 py-2 flex items-center gap-2">
                      {/* Dot */}
                      {showToggle && visibility === 'both' && (
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ownerColor }} title={ownerName} />
                      )}

                      {/* Main button/content */}
                      {isMine ? (
                        <button onClick={() => setEditing({ activity: a, date: a.scheduled_date })}
                          className={`flex-1 text-left ${a.completed ? 'line-through opacity-60' : ''}`}>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-xs text-muted mt-0.5">{activityDetails(a)}</p>
                         </button>
                       ) : (
                         <>
                           <div className="flex-1 text-left">
                             <p className="font-medium">{a.title}</p>
                             <p className="text-xs text-muted mt-0.5">
                              {[visibility === 'both' ? ownerName : '', activityDetails(a)].filter(Boolean).join(' Â· ')}
                            </p>
                          </div>
                          {a.completed && <span className="text-muted text-xs">Done</span>}
                        </>
                      )}

                      {/* My toggle */}
                      {isMine && (
                        <ToggleStatus activityId={a.id} current={a.completed} />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          <ExportButton items={visible} start={start} prefixNames={showToggle && visibility === 'both'} key={start} />
        </>
      )}
    </div>
  )
}

function ToggleStatus({ activityId, current }: { activityId: string; current: boolean }) {
  const other = !current
  const mutation = useMutation({
    mutationFn: () => updateActivity(activityId, { completed: other }),
    onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['activities'] }),
  })

  return (
    <button onClick={() => mutation.mutate()} aria-pressed={current} disabled={mutation.isPending}
      className={`px-2 py-1 text-xs font-semibold rounded disabled:opacity-50 ${
        mutation.isError ? 'bg-coral-light/50 text-danger'
          : current ? 'text-link font-semibold' : 'bg-card text-muted hover:bg-coral-light/50 font-semibold'
      }`}>
      {mutation.isError ? 'Try again' : current ? 'Done' : 'Planned'}
    </button>
  )
}
