import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import type { MealPrep } from './types'
import type { PrepFormInput } from './formValidation'
import { parsePrepForm, prepFormFrom } from './formValidation'
import { insertPrep, updatePrep, deletePrep } from './prepApi'
import { useProfile } from '../household/useProfile'

const emptyInput: PrepFormInput = { title: '', date: '', startTime: '', duration: '', servings: '', recipeUrl: '', ingredients: '', notes: '' }

export default function PrepForm({
  prep,
  date,
  onClose,
}: {
  prep?: MealPrep
  date: string
  onClose: () => void
}) {
  const [input, setInput] = useState<PrepFormInput>(prep ? prepFormFrom(prep) : { ...emptyInput, date })
  const [errors, setErrors] = useState<Partial<Record<keyof PrepFormInput, string>>>({})
  const [deleteStep, setDeleteStep] = useState(0)
  const { profile } = useProfile()

  const changeField = (field: keyof PrepFormInput) => ({ target }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput({ ...input, [field]: target.value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  const textareaClass = 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500'

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!profile?.household_id) throw new Error('Join or create a household first.')
      const parsed = parsePrepForm(input)
      if (!parsed.ok) throw new Error(Object.values(parsed.errors).join('\n'))
      if (prep) return updatePrep(prep.id, parsed.fields)
      return insertPrep(profile.household_id, profile.id, parsed.fields)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-prep'] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePrep(prep!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meal-prep'] })
      onClose()
    },
  })

  const anyPending = saveMutation.isPending || deleteMutation.isPending
  const isSaveLoading = saveMutation.isPending
  const isDeleteLoading = deleteMutation.isPending

  const headingText = prep ? 'Edit prep session' : 'New prep session'

  return (
    <div className="bg-slate-900 rounded p-3 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 px-1">{headingText}</h2>

      {/* Name */}
      <div>
        <label htmlFor="prep-title" className="block text-gray-400 text-sm mb-1">Name</label>
        <input id="prep-title" type="text" value={input.title} onChange={changeField('title')} placeholder="What are you prepping?"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Date */}
      <div>
        <label htmlFor="prep-date" className="block text-gray-400 text-sm mb-1">Date</label>
        <input id="prep-date" type="date" value={input.date} onChange={changeField('date')}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
      </div>

      {/* Start time */}
      <div>
        <label htmlFor="prep-time" className="block text-gray-400 text-sm mb-1">Start time</label>
        <input id="prep-time" type="time" value={input.startTime} onChange={changeField('startTime')}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        <p className="text-gray-600 text-xs mt-1">Optional</p>
        {errors.startTime && <p className="text-red-400 text-xs mt-1">{errors.startTime}</p>}
      </div>

      {/* Minutes & Servings side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="prep-minutes" className="block text-gray-400 text-sm mb-1">Minutes</label>
          <input id="prep-minutes" type="text" inputMode="numeric" value={input.duration} onChange={changeField('duration')} placeholder="60"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          {errors.duration && <p className="text-red-400 text-xs mt-1">{errors.duration}</p>}
        </div>
        <div>
          <label htmlFor="prep-servings" className="block text-gray-400 text-sm mb-1">Servings</label>
          <input id="prep-servings" type="text" inputMode="numeric" value={input.servings} onChange={changeField('servings')} placeholder="1"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          {errors.servings && <p className="text-red-400 text-xs mt-1">{errors.servings}</p>}
        </div>
      </div>

      {/* Recipe link */}
      <div>
        <label htmlFor="prep-url" className="block text-gray-400 text-sm mb-1">Recipe link</label>
        <input id="prep-url" type="url" value={input.recipeUrl} onChange={changeField('recipeUrl')} placeholder="https://example.com/recipe"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
        <p className="text-gray-600 text-xs mt-1">Optional</p>
        {errors.recipeUrl && <p className="text-red-400 text-xs mt-1">{errors.recipeUrl}</p>}
      </div>

      {/* Ingredients */}
      <div>
        <label htmlFor="prep-ingredients" className="block text-gray-400 text-sm mb-1">Ingredients</label>
        <textarea id="prep-ingredients" rows={5} value={input.ingredients} onChange={changeField('ingredients')}
          placeholder="One per line, like 2 cup rice" className={textareaClass} />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="prep-notes" className="block text-gray-400 text-sm mb-1">Notes</label>
        <textarea id="prep-notes" rows={3} value={input.notes ?? ''} onChange={changeField('notes')} placeholder="Optional notes" className={textareaClass} />
      </div>

      {saveMutation.isError && (
        <p className="text-red-400 text-sm px-1">
          {saveMutation.error instanceof Error ? saveMutation.error.message : 'Something went wrong'}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => saveMutation.mutate()} disabled={anyPending}
          className="py-3 rounded font-semibold text-white flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-center">
          {isSaveLoading ? 'Saving…' : 'Save'}
        </button>

        {prep && (
          <button type="button" onClick={() => deleteStep === 0 ? setDeleteStep(1) : deleteMutation.mutate()} disabled={anyPending}
            className={`py-3 rounded font-semibold text-white flex-1 transition-colors ${
              isDeleteLoading
                ? 'bg-slate-600 cursor-not-allowed'
                : deleteStep === 1
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-700 hover:bg-slate-600'
            }`}>
            {isDeleteLoading ? 'Deleting…' : deleteStep === 1 ? 'Tap again to delete' : 'Delete'}
          </button>
        )}

        <button type="button" onClick={onClose} disabled={anyPending}
          className="py-3 rounded bg-slate-700 text-white font-semibold px-4 hover:bg-slate-600">
          Cancel
        </button>
      </div>
    </div>
  )
}
