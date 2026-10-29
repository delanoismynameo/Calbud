import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from './useProfile'
import { supabase } from '../lib/supabase'
import { COLORS } from './colors'

interface ProfileStepProps {
  onDone: () => void
}

export default function ProfileStep({ onDone }: ProfileStepProps) {
  const { profile, refresh } = useProfile()
  const { session } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [color, setColor] = useState(
    COLORS.includes(profile?.color ?? '') ? profile!.color : '#6366f1'
  )
  const [goalCalories, setGoalCalories] = useState(String(profile?.goal_calories ?? ''))
  const [goalProtein, setGoalProtein] = useState(String(profile?.goal_protein_g ?? ''))
  const [goalCarbs, setGoalCarbs] = useState(String(profile?.goal_carbs_g ?? ''))
  const [goalFat, setGoalFat] = useState(String(profile?.goal_fat_g ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = () => {
    if (!displayName.trim()) { setError('Display name is required.'); return false }
    for (const val of [goalCalories, goalProtein, goalCarbs, goalFat]) {
      const n = Number(val)
      if (val.trim() === '' || !Number.isInteger(n) || n < 1) {
        setError('Goals must be whole numbers of at least 1.')
        return false
      }
    }
    return true
  }

  const submit = async () => {
    setError(null)
    if (!validate()) return
    setSaving(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const userId = session!.user.id
    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(), color, goal_calories: Number(goalCalories),
        goal_protein_g: Number(goalProtein), goal_carbs_g: Number(goalCarbs),
        goal_fat_g: Number(goalFat), timezone: tz,
      })
      .eq('id', userId)
    setSaving(false)
    if (updErr) { setError(updErr.message); return }
    await refresh()
    onDone()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Step 1 of 2</p>

      <div><label htmlFor="dn" className="block text-gray-400 text-sm mb-1">Display name</label>
        <input id="dn" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={40}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" /></div>

      <div><label className="block text-gray-400 text-sm mb-1">Colour</label>
        <div className="flex gap-2">{COLORS.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)} aria-label={c}
            aria-pressed={color === c} style={{ backgroundColor: c }}
            className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-white' : ''}`} />))}</div></div>

      <div><label className="block text-gray-400 text-sm mb-1">Daily goals</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'Calories', val: goalCalories, set: setGoalCalories },
            { key: 'Protein (g)', val: goalProtein, set: setGoalProtein },
            { key: 'Carbs (g)', val: goalCarbs, set: setGoalCarbs },
            { key: 'Fat (g)', val: goalFat, set: setGoalFat },
          ].map(({ key, val, set }) => (
            <div key={key}><label htmlFor={`goal-${key}`} className="block text-xs text-gray-400">{key}</label>
              <input id={`goal-${key}`} type="number" min={1} step={1} value={val}
                onChange={(e) => set(e.target.value)} required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
          ))}</div></div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={submit} disabled={saving}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded text-white font-semibold">
        {saving ? 'Saving...' : 'Continue'}
      </button>
    </div>
  )
}
