import { useState } from 'react'
import { useProfile } from './useProfile'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import CopyCode from './CopyCode'

type Mode = 'choice' | 'create' | 'join'

const inputClass = 'w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral'
const choiceClass = 'w-full py-3 bg-coral-light hover:bg-coral-light/70 rounded-2xl text-link font-semibold'
const primaryClass = 'w-full py-3 bg-coral-deep hover:bg-coral-deeper disabled:bg-coral-light/50 disabled:text-link rounded-2xl font-bold text-white'

export default function HouseholdStep({ onBack }: { onBack: () => void }) {
  const { profile, refresh } = useProfile()
  const [mode, setMode] = useState<Mode>('choice')
  const [hhName, setHhName] = useState(`${profile?.display_name ?? ''}'s household`)
  const [code, setCode] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCode, setNewCode] = useState<string | null>(null)

  const go = (m: Mode) => { setError(null); setMode(m) }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hhName.trim()) return
    setError(null)
    setRunning(true)
    const { data: id, error: rpcErr } = await supabase.rpc('create_household', { p_name: hhName.trim() })
    if (rpcErr) { setError(friendlyError(rpcErr.message)); setRunning(false); return }
    const { data: hh } = await supabase.from('households').select('invite_code').eq('id', id).single()
    setRunning(false)
    // The household exists either way; if its code can't be read, go straight in (Us shows it).
    if (hh) setNewCode(hh.invite_code)
    else await refresh()
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { setError('Enter the code your partner shared.'); return }
    setError(null)
    setRunning(true)
    const { error: rpcErr } = await supabase.rpc('join_household', { p_code: code.trim().toLowerCase() })
    if (rpcErr) { setError(friendlyError(rpcErr.message)); setRunning(false); return }
    await refresh()
  }

  const back = (
    <button type="button" onClick={() => (mode === 'choice' ? onBack() : go('choice'))} disabled={running}
      className="text-xs text-link font-semibold hover:underline">Back</button>
  )

  if (newCode) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Step 2 of 2</p>
        <p className="text-sm text-muted">Share this code with your partner:</p>
        <CopyCode code={newCode} large />
        <button type="button" onClick={() => refresh()} className={primaryClass}>Done</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Step 2 of 2</p>

      {mode === 'choice' && (
        <>
          <button type="button" onClick={() => go('create')} className={choiceClass}>Create a household</button>
          <button type="button" onClick={() => go('join')} className={choiceClass}>Join with a code</button>
        </>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="space-y-3">
          <div><label htmlFor="hhn" className="block text-muted text-sm mb-1">Household name</label>
            <input id="hhn" type="text" value={hhName} onChange={(e) => setHhName(e.target.value)} required maxLength={80} className={inputClass} /></div>
          <button type="submit" disabled={running || !hhName.trim()} className={primaryClass}>
            {running ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="space-y-3">
          <div><label htmlFor="code" className="block text-muted text-sm mb-1">Invite code</label>
            <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)}
              autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={20} className={inputClass} /></div>
          <button type="submit" disabled={running} className={primaryClass}>
            {running ? 'Joining…' : 'Join'}
          </button>
        </form>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}
      {back}
    </div>
  )
}
