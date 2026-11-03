import { useEffect, useState } from 'react'
import { useProfile } from './useProfile'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { COLORS } from './colors'
import { getPushStatus, subscribeToPush } from '../lib/notifications'
import { 
  parseProfileEdit, 
  timeZones, 
  zoneLabel, 
  type ProfileInput,
  formatTimeDisplay,
} from './profileEdit'

export default function YouCard() {
  const { profile, refresh } = useProfile()
  const { session } = useAuth()
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState<ProfileInput>({ 
    name: '', 
    color: '', 
    timezone: '',
    reminder_time: null 
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'denied' | 'on' | 'off'>('unsupported')
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    getPushStatus().then(setPushStatus).catch(() => setPushStatus('unsupported'))
  }, [])

  const turnOnPush = async () => {
    setPushBusy(true)
    const endpoint = await subscribeToPush(session!.user.id).catch(() => null)
    setPushStatus(endpoint ? 'on' : await getPushStatus().catch(() => 'unsupported' as const))
    setPushBusy(false)
  }

  if (!profile) return null

  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
  const zones = timeZones(supported, profile.timezone)
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const openEdit = () => {
    setEditing(true)
    setInput({ 
      name: profile.display_name, 
      color: profile.color, 
      timezone: profile.timezone,
      reminder_time: profile.reminder_time ?? '07:30'  // Default to breakfast time if not set
    })
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
          reminder_time: result.changes.reminder_time,
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
          <span className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">You</span>
          <button onClick={openEdit} className="text-sm text-link underline font-semibold">
            Edit
          </button>
        </div>
        <p className="text-sm text-ink mb-2">
          <span className="w-3 h-3 rounded-full inline-block mr-2" style={{ backgroundColor: profile.color }} />
          {profile.display_name}
        </p>
        <p className="text-sm text-muted">Time zone: {zoneLabel(profile.timezone)}</p>
        {deviceZone !== profile.timezone && (
          <p className="text-xs text-warn">This phone is set to {zoneLabel(deviceZone)}.</p>
        )}
        {profile.reminder_time && (
          <p className="text-xs text-muted mt-1">
            Meal reminder: {formatTimeDisplay(profile.reminder_time)}
          </p>
        )}
        {profile.reminder_time && pushStatus === 'off' && (
          <button onClick={turnOnPush} disabled={pushBusy}
            className="text-sm text-link underline font-semibold mt-2 disabled:opacity-50">
            Also remind me when my phone is locked
          </button>
        )}
        {profile.reminder_time && pushStatus === 'on' && (
          <p className="text-xs text-muted mt-1">Phone reminders are on.</p>
        )}
        {profile.reminder_time && pushStatus === 'denied' && (
          <p className="text-xs text-warn mt-1">Notifications are blocked in this browser&apos;s settings.</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-card rounded-3xl shadow-card p-5">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-section mb-2">You</p>
      <div className="space-y-2">
        <div>
          <label htmlFor="you-name" className="block text-sm text-muted mb-1">Name</label>
          <input id="you-name" type="text" value={input.name}
            onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
          {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <p className="block text-sm text-muted mb-1">Colour</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button"
                onClick={() => setInput((prev) => ({ ...prev, color: c }))}
                style={{ backgroundColor: c }}
                aria-label={`Colour ${c}`}
                aria-pressed={input.color === c}
                className={`w-8 h-8 rounded-full ${input.color === c ? 'ring-2 ring-offset-2 ring-coral' : ''}`} />
            ))}
          </div>
          {errors.color && <p className="text-danger text-xs mt-1">{errors.color}</p>}
        </div>
        <div>
          <label htmlFor="you-timezone" className="block text-sm text-muted mb-1">Time zone</label>
          <select id="you-timezone" value={input.timezone}
            onChange={(e) => setInput((prev) => ({ ...prev, timezone: e.target.value }))}
            className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral">
            {zones.map((z) => (
              <option key={z} value={z}>{zoneLabel(z)}</option>
            ))}
          </select>
          {deviceZone !== input.timezone && zones.includes(deviceZone) && (
            <button type="button" onClick={() => setInput((prev) => ({ ...prev, timezone: deviceZone }))}
              className="text-sm text-link underline mt-1 font-semibold">
              Use this phone&apos;s time zone ({zoneLabel(deviceZone)})
            </button>
          )}
          {errors.timezone && <p className="text-danger text-xs mt-1">{errors.timezone}</p>}
        </div>
        <div>
          <label htmlFor="reminder-time" className="block text-sm text-muted mb-1">Meal reminder time</label>
          <input id="reminder-time" type="time" 
            value={input.reminder_time ?? ''}
            onChange={(e) => setInput((prev) => ({ ...prev, reminder_time: e.target.value || null }))}
            className="w-full bg-card border border-line rounded-2xl text-ink px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" />
          <p className="text-xs text-muted mt-1">
            We&apos;ll remind you to log meals at this time
          </p>
        </div>
      </div>
      {saveError && <p className="text-danger text-sm">{saveError}</p>}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving}
          className="flex-1 py-3 rounded-2xl bg-coral-deep hover:bg-coral-deeper disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} disabled={saving}
          className="flex-1 py-3 rounded-2xl bg-coral-light text-link font-semibold hover:bg-coral-deeper">
          Cancel
        </button>
      </div>
    </div>
  )
}