import { useState } from 'react'
import { useProfile } from './useProfile'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { COLORS } from './colors'
import { parseProfileEdit, timeZones, zoneLabel, type ProfileInput } from './profileEdit'

export default function YouCard() {
  const { profile, refresh } = useProfile()
  const { session } = useAuth()
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState<ProfileInput>({ name: '', color: '', timezone: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!profile) return null

  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
  const zones = timeZones(supported, profile.timezone)
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const openEdit = () => {
    setEditing(true)
    setInput({ name: profile.display_name, color: profile.color, timezone: profile.timezone })
    setErrors({})
    setSaveError(null)
  }

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    const result = parseProfileEdit(input, zones)
    if (!result.ok) {
      setErrors(result.errors)
      setSaving(false)
      return
    }
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          display_name: result.changes.display_name,
          color: result.changes.color,
          timezone: result.changes.timezone,
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
          <span className="font-semibold text-sm">You</span>
          <button onClick={openEdit} className="text-sm text-blue-400 hover:text-blue-300">
            Edit
          </button>
        </div>
        <p className="text-sm text-gray-300">
          <span className="w-3 h-3 rounded-full inline-block mr-2" style={{ backgroundColor: profile.color }} />
          {profile.display_name}
        </p>
        <p className="text-sm text-gray-400">Time zone: {zoneLabel(profile.timezone)}</p>
        {deviceZone !== profile.timezone && (
          <p className="text-xs text-amber-400">This phone is set to {zoneLabel(deviceZone)}.</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 text-left space-y-3">
      <p className="font-semibold text-sm">You</p>
      <div className="space-y-2">
        <div>
          <label htmlFor="you-name" className="block text-xs text-gray-400 mb-1">Name</label>
          <input id="you-name" type="text" value={input.name}
            onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <p className="block text-xs text-gray-400 mb-1">Colour</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button"
                onClick={() => setInput((prev) => ({ ...prev, color: c }))}
                style={{ backgroundColor: c }}
                aria-label={`Colour ${c}`}
                aria-pressed={input.color === c}
                className={`w-8 h-8 rounded-full ${input.color === c ? 'ring-2 ring-white' : ''}`} />
            ))}
          </div>
          {errors.color && <p className="text-red-400 text-xs mt-1">{errors.color}</p>}
        </div>
        <div>
          <label htmlFor="you-timezone" className="block text-xs text-gray-400 mb-1">Time zone</label>
          <select id="you-timezone" value={input.timezone}
            onChange={(e) => setInput((prev) => ({ ...prev, timezone: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500">
            {zones.map((z) => (
              <option key={z} value={z}>{zoneLabel(z)}</option>
            ))}
          </select>
          {deviceZone !== input.timezone && zones.includes(deviceZone) && (
            <button type="button" onClick={() => setInput((prev) => ({ ...prev, timezone: deviceZone }))}
              className="text-sm text-blue-400 underline mt-1">
              Use this phone&apos;s time zone ({zoneLabel(deviceZone)})
            </button>
          )}
          {errors.timezone && <p className="text-red-400 text-xs mt-1">{errors.timezone}</p>}
        </div>
      </div>
      {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving}
          className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold">
          {saving ? 'Saving\u2026' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} disabled={saving}
          className="flex-1 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold">
          Cancel
        </button>
      </div>
    </div>
  )
}
