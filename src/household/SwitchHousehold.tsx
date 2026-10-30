import { useState } from 'react'
import { useProfile } from './useProfile'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { queryClient } from '../lib/queryClient'

const choiceClass = 'w-full py-3 bg-coral-light text-link hover:bg-coral-deeper rounded-2xl font-semibold'
const inputClass = 'w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral'
const primaryClass = 'w-full py-3 bg-coral-deep hover:bg-coral-deeper disabled:cursor-not-allowed disabled:opacity-50 rounded-2xl text-white font-bold'

export default function SwitchHousehold() {
  const { refresh } = useProfile()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('Enter the code your partner shared.')
      return
    }
    setError(null)
    setRunning(true)
    const { error: rpcErr } = await supabase.rpc('join_household', { p_code: code.trim().toLowerCase() })
    if (rpcErr) { setError(friendlyError(rpcErr.message)); setRunning(false); return }
    await queryClient.invalidateQueries()
    await refresh()
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={choiceClass}>Join your partner's household instead</button>
  }

  return (
    <form onSubmit={handleJoin} className="space-y-3">
      <p className="text-sm text-muted">Use this if your partner already made a household. Your food log, saved foods and meal prep move with you, and this household is deleted.</p>
      <div><label htmlFor="switch-code" className="block text-muted mb-1">Partner's invite code</label>
        <input id="switch-code" type="text" value={code} onChange={(e) => setCode(e.target.value)}
          autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={20} className={inputClass} /></div>
      <button type="submit" disabled={running} className={primaryClass}>
        {running ? 'Joining…' : 'Join'}
      </button>
      <button type="button" onClick={() => { setOpen(false); setCode(''); setError(null) }} disabled={running}
        className="text-xs text-muted hover:text-ink underline">Cancel</button>
      {error && <p className="text-danger text-sm">{error}</p>}
    </form>
  )
}
