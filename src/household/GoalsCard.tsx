import { useState } from 'react'
import { useProfile } from './useProfile'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { parseGoals, type GoalInput } from './goals'

const FIELDS: { key: keyof GoalInput; id: string; label: string }[] = [
  { key: 'calories', id: 'goal-calories', label: 'Calories' },
  { key: 'protein', id: 'goal-protein', label: 'Protein (g)' },
  { key: 'carbs', id: 'goal-carbs', label: 'Carbs (g)' },
  { key: 'fat', id: 'goal-fat', label: 'Fat (g)' },
]

export default function GoalsCard() {
  const { profile, refresh } = useProfile()
  const { session } = useAuth()
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState<GoalInput>({ calories: '', protein: '', carbs: '', fat: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof GoalInput, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!profile) return null

  const openEdit = () => {
    setEditing(true)
    setInput({
      calories: String(profile.goal_calories ?? ''),
      protein: String(profile.goal_protein_g ?? ''),
      carbs: String(profile.goal_carbs_g ?? ''),
      fat: String(profile.goal_fat_g ?? ''),
    })
    setErrors({})
    setSaveError(null)
  }

  const updateField = (key: keyof GoalInput, value: string) => {
    setInput((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return prev
    })
  }

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    const result = parseGoals(input)
    if (!result.ok) {
      setErrors(result.errors)
      setSaving(false)
      return
    }
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          goal_calories: result.goals.goal_calories,
          goal_protein_g: result.goals.goal_protein_g,
          goal_carbs_g: result.goals.goal_carbs_g,
          goal_fat_g: result.goals.goal_fat_g,
        })
        .eq('id', session!.user.id)
      if (updErr) {
        setSaveError(updErr.message)
        setSaving(false)
        return
      }
      await refresh()
      setSaving(false)
      setEditing(false)
    } catch (err: any) {
      setSaveError(err.message ?? 'An unexpected error occurred.')
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 text-left space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm">Your daily goals</span>
          <button onClick={openEdit} className="text-sm text-blue-400 hover:text-blue-300">
            Edit
          </button>
        </div>
        <p className="text-sm text-gray-300">
          {profile.goal_calories} cal · {profile.goal_protein_g} g protein · {profile.goal_carbs_g} g carbs · {profile.goal_fat_g} g fat
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 text-left space-y-3">
      <p className="font-semibold text-sm">Your daily goals</p>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ key, id, label }) => (
          <div key={key}>
            <label htmlFor={id} className="block text-xs text-gray-400 mb-1">{label}</label>
            <input id={id} type="text" inputMode="numeric" value={input[key]}
              onChange={(e) => updateField(key, e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" />
            {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
          </div>
        ))}
      </div>
      {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="flex-1 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
