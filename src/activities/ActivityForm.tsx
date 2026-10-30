import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import type { Activity } from './types'
import { parseActivityForm, activityFormFrom, type ActivityFormInput } from './activities'
import { insertActivity, updateActivity, deleteActivity } from './activitiesApi'
import { useAuth } from '../auth/AuthProvider'

const emptyInput: ActivityFormInput = { title: '', date: '', startTime: '', duration: '', kcal: '', notes: '' }

export default function ActivityForm({ activity, date, onClose }: { activity?: Activity; date: string; onClose: () => void }) {
  const [input, setInput] = useState<ActivityFormInput>(activity ? activityFormFrom(activity) : { ...emptyInput, date })
  const [errors, setErrors] = useState<Partial<Record<keyof ActivityFormInput, string>>>({})
  const [deleteStep, setDeleteStep] = useState(0)

  const { session } = useAuth()
  const userId = session?.user.id ?? ''

  const changeField = <K extends keyof ActivityFormInput>(field: K) => ({ target }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput({ ...input, [field]: target.value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user id.')
      const parsed = parseActivityForm(input)
      if (!parsed.ok) throw new Error(Object.values(parsed.errors).join(' '))
      if (activity) {
        await updateActivity(activity.id, parsed.fields)
      } else {
        await insertActivity(userId, parsed.fields)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['activities'] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteActivity(activity!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['activities'] })
      onClose()
    },
  })

  const save = () => {
    const parsed = parseActivityForm(input)
    setErrors(parsed.ok ? {} : parsed.errors)
    if (!parsed.ok) return
    saveMutation.mutate()
  }

  const anyPending = saveMutation.isPending || deleteMutation.isPending

  const headingText = activity ? 'Edit activity' : 'New activity'

  return (
    <div className="bg-cream rounded-3xl shadow-card p-5 space-y-4">
      <h2 className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">{headingText}</h2>

      {/* Name */}
      <div>
        <label htmlFor="activity-title" className="block text-muted text-sm mb-1">Name</label>
        <input id="activity-title" type="text" value={input.title} onChange={changeField('title')} placeholder="What are you doing?"
          className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
        {errors.title && <p className="text-danger text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Date */}
      <div>
        <label htmlFor="activity-date" className="block text-muted text-sm mb-1">Date</label>
        <input id="activity-date" type="date" value={input.date} onChange={(e) => { setInput({ ...input, date: e.target.value }); if (errors.date) setErrors({ ...errors, date: undefined }) }}
          className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
        {errors.date && <p className="text-danger text-xs mt-1">{errors.date}</p>}
      </div>

      {/* Start time */}
      <div>
        <label htmlFor="activity-time" className="block text-muted text-sm mb-1">Start time</label>
        <input id="activity-time" type="time" value={input.startTime} onChange={changeField('startTime')}
          className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
        <p className="text-muted text-xs mt-1">Optional</p>
        {errors.startTime && <p className="text-danger text-xs mt-1">{errors.startTime}</p>}
      </div>

      {/* Length & Calories side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="activity-minutes" className="block text-muted text-sm mb-1">Length (min)</label>
          <input id="activity-minutes" type="text" inputMode="numeric" value={input.duration} onChange={changeField('duration')} placeholder="60"
            className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
          {errors.duration && <p className="text-danger text-xs mt-1">{errors.duration}</p>}
        </div>
        <div>
          <label htmlFor="activity-kcal" className="block text-muted text-sm mb-1">Calories</label>
          <input id="activity-kcal" type="text" inputMode="numeric" value={input.kcal} onChange={changeField('kcal')} placeholder="Optional"
            className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
          {errors.kcal && <p className="text-danger text-xs mt-1">{errors.kcal}</p>}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="activity-notes" className="block text-muted text-sm mb-1">Notes</label>
        <textarea id="activity-notes" rows={3} value={input.notes} onChange={changeField('notes')} placeholder="Optional notes"
          className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
      </div>

      {saveMutation.isError && <p className="text-danger text-sm px-1">{saveMutation.error.message}</p>}
      {deleteMutation.isError && <p className="text-danger text-sm px-1">{deleteMutation.error.message}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={save} disabled={anyPending}
          className="bg-coral-deep hover:bg-coral-deeper text-white rounded-2xl font-bold py-3 flex-1 text-center disabled:bg-coral-light/50 disabled:text-muted disabled:cursor-not-allowed">
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>

        {activity && (
          <button type="button" onClick={() => deleteStep === 0 ? setDeleteStep(1) : deleteMutation.mutate()} disabled={anyPending}
            className={`font-bold flex-1 transition-colors py-3 rounded-2xl ${
              deleteMutation.isPending
                ? 'text-muted cursor-not-allowed bg-transparent'
                : deleteStep === 1
                  ? 'bg-coral-deep hover:bg-coral-deeper text-white'
                  : 'text-danger'
            }`}>
            {deleteMutation.isPending ? 'Deleting…' : deleteStep === 1 ? 'Tap again to delete' : 'Delete'}
          </button>)}

        <button type="button" onClick={onClose} disabled={anyPending}
          className="bg-coral-light text-link rounded-2xl font-semibold py-3 px-4 hover:bg-coral-deeper">
          Cancel
        </button>
      </div>
    </div>
  )
}
