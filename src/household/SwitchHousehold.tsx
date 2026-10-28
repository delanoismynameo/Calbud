import { useState } from 'react'
import { useProfile } from './useProfile'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { queryClient } from '../lib/queryClient'

const choiceClass = 'w-full py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-semibold'
const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500'
const primaryClass = 'w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white font-semibold'

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
      <p className="text-sm text-gray-400">Use this if your partner already made a household. Your food log, saved foods and meal prep move with you, and this household is deleted.</p>
      <div><label htmlFor="switch-code" className="block text-gray-400 text-sm mb-1">Partner's invite code</label>
        <input id="switch-code" type="text" value={code} onChange={(e) => setCode(e.target.value)}
          autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={20} className={inputClass} /></div>
      <button type="submit" disabled={running} className={primaryClass}>
        {running ? 'Joining…' : 'Join'}
      </button>
      <button type="button" onClick={() => { setOpen(false); setCode(''); setError(null) }} disabled={running}
        className="text-xs text-gray-400 hover:text-white">Cancel</button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  )
}
