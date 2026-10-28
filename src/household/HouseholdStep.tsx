import { useState, useCallback } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from './ProfileProvider'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'

export default function HouseholdStep() {
  const { profile, refresh } = useProfile()
  const { session } = useAuth()
  type Mode = 'choice' | 'create' | 'join'
  const [mode, setMode] = useState<Mode>('choice')
  const [hhName, setHhName] = useState(`${profile?.display_name ?? ''}'s household`)
  const [code, setCode] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ code: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const copyCode = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [result])

  const handleCreate = async () => {
    if (!hhName.trim()) return
    setRunning(true)
    const { data, error } = await supabase.rpc('create_household', { p_name: hhName.trim() })
    if (error) {
      alert(friendlyError(error.message))
      setRunning(false)
      return
    }
    // read the household to get the invite code
    const { data: hh } = await supabase
      .from('households')
      .select('*')
      .eq('id', data)
      .single()
    setResult(hh ? { code: hh.invite_code } : null)
    setRunning(false)
  }

  const handleJoin = async () => {
    if (!code.trim()) { alert(friendlyError('Enter the code your partner shared.')); return }
    setRunning(true)
    const errData = await supabase.rpc('join_household', { p_code: code.trim().toLowerCase() })
    if (errData.error) {
      alert(friendlyError(errData.error.message))
      setRunning(false)
      return
    }
    await refresh()
  }

  const handleDone = async () => {
    await refresh()
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">Step 2 of 2</p>

      {mode === 'choice' && (
        <div className="space-y-3">
          <button onClick={() => setMode('create')}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-semibold"
            disabled={running}>Create a household</button>
          <button onClick={() => setMode('join')}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-semibold"
            disabled={running}>Join with a code</button>
        </div>
      )}

      {mode === 'create' && (
        <div className="space-y-3">
          <div><label htmlFor="hhn" className="block text-gray-400 text-sm mb-1">Household name</label>
            <input id="hhn" type="text" value={hhName} onChange={(e) => setHhName(e.target.value)} required maxLength={80}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" /></div>

          {result ? (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Share this code with your partner:</p>
              <p className="text-xl font-mono text-center bg-slate-900 rounded p-3 break-all">{result.code}</p>
              <div className="flex gap-2">
                <button onClick={copyCode}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm disabled:opacity-50"
                  disabled={!result || copied}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={handleDone} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold">Done</button>
              </div>
            </div>
          ) : (
            <button onClick={handleCreate} disabled={running || !hhName.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded text-white font-semibold cursor-not-allowed">
              {running ? 'Creating...' : 'Create'}
            </button>
          )}
          <button onClick={() => setMode('choice')} className="text-xs text-gray-400 hover:text-white -mt-2">Back</button>
        </div>
      )}

      {mode === 'join' && (
        <div className="space-y-3">
          <div><label htmlFor="code" className="block text-gray-400 text-sm mb-1">Invite code</label>
            <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)}
              autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={20}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" /></div>
          <button onClick={handleJoin} disabled={running || !code.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded text-white font-semibold cursor-not-allowed">
            {running ? 'Joining...' : 'Join'}
          </button>
          <button onClick={() => setMode('choice')} className="text-xs text-gray-400 hover:text-white -mt-2">Back</button>
        </div>
      )}
    </div>
  )
}
