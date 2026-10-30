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
      <div className="bg-card rounded-3xl shadow-card p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">Your daily goals</span>
          <button onClick={openEdit} className="text-sm text-link underline font-semibold">
            Edit
          </button>
        </div>
        <p className="text-sm text-ink">{profile.goal_calories} cal · {profile.goal_protein_g} g protein · {profile.goal_carbs_g} g carbs · {profile.goal_fat_g} g fat</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-3xl shadow-card p-5">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-section mb-2">Your daily goals</p>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ key, id, label }) => (
          <div key={key}>
            <label htmlFor={id} className="block text-sm text-muted mb-1">{label}</label>
            <input id={id} type="text" inputMode="numeric" value={input[key]}
              onChange={(e) => updateField(key, e.target.value)}
              className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
            {errors[key] && <p className="text-danger text-xs mt-1">{errors[key]}</p>}
          </div>
        ))}
      </div>
      {saveError && <p className="text-danger text-sm">{saveError}</p>}
      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl bg-coral-deep hover:bg-coral-deeper disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl bg-coral-light text-link font-semibold hover:bg-coral-deeper"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
