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
    <div className="bg-slate-900 rounded p-3 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 px-1">{headingText}</h2>

      {/* Name */}
      <div>
        <label htmlFor="activity-title" className="block text-gray-400 text-sm mb-1">Name</label>
        <input id="activity-title" type="text" value={input.title} onChange={changeField('title')} placeholder="What are you doing?"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Date */}
      <div>
        <label htmlFor="activity-date" className="block text-gray-400 text-sm mb-1">Date</label>
        <input id="activity-date" type="date" value={input.date} onChange={(e) => { setInput({ ...input, date: e.target.value }); if (errors.date) setErrors({ ...errors, date: undefined }) }}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
      </div>

      {/* Start time */}
      <div>
        <label htmlFor="activity-time" className="block text-gray-400 text-sm mb-1">Start time</label>
        <input id="activity-time" type="time" value={input.startTime} onChange={changeField('startTime')}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        <p className="text-gray-600 text-xs mt-1">Optional</p>
        {errors.startTime && <p className="text-red-400 text-xs mt-1">{errors.startTime}</p>}
      </div>

      {/* Length & Calories side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="activity-minutes" className="block text-gray-400 text-sm mb-1">Length (min)</label>
          <input id="activity-minutes" type="text" inputMode="numeric" value={input.duration} onChange={changeField('duration')} placeholder="60"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          {errors.duration && <p className="text-red-400 text-xs mt-1">{errors.duration}</p>}
        </div>
        <div>
          <label htmlFor="activity-kcal" className="block text-gray-400 text-sm mb-1">Calories</label>
          <input id="activity-kcal" type="text" inputMode="numeric" value={input.kcal} onChange={changeField('kcal')} placeholder="Optional"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          {errors.kcal && <p className="text-red-400 text-xs mt-1">{errors.kcal}</p>}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="activity-notes" className="block text-gray-400 text-sm mb-1">Notes</label>
        <textarea id="activity-notes" rows={3} value={input.notes} onChange={changeField('notes')} placeholder="Optional notes"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
      </div>

      {saveMutation.isError && <p className="text-red-400 text-sm px-1">{saveMutation.error.message}</p>}
      {deleteMutation.isError && <p className="text-red-400 text-sm px-1">{deleteMutation.error.message}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={save} disabled={anyPending}
          className="py-3 rounded font-semibold text-white flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-center">
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>

        {activity && (
          <button type="button" onClick={() => deleteStep === 0 ? setDeleteStep(1) : deleteMutation.mutate()} disabled={anyPending}
            className={`py-3 rounded font-semibold text-white flex-1 transition-colors ${
              deleteMutation.isPending
                ? 'bg-slate-600 cursor-not-allowed'
                : deleteStep === 1
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-700 hover:bg-slate-600'
            }`}>
            {deleteMutation.isPending ? 'Deleting…' : deleteStep === 1 ? 'Tap again to delete' : 'Delete'}
          </button>)}

        <button type="button" onClick={onClose} disabled={anyPending}
          className="py-3 rounded bg-slate-700 text-white font-semibold px-4 hover:bg-slate-600">
          Cancel
        </button>
      </div>
    </div>
  )
}
