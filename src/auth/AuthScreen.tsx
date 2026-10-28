import { useState, FormEvent, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '../lib/supabase'
import { authRedirectUrl } from '../lib/supabase'

type Mode = 'signIn' | 'signUp' | 'forgotPassword'

export default function AuthScreen() {
  const { urlNotice, clearRecovery } = useAuth()
  useEffect(() => () => clearRecovery(), [])
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setSuccess(null); setError(null) }, [mode])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    clearRecovery()
    if (mode === 'signIn') {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) setError(error.message)
    } else if (mode === 'signUp') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      setLoading(true)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: displayName }, emailRedirectTo: authRedirectUrl() },
      })
      setLoading(false)
      if (signUpError) setError(signUpError.message)
      else if (!data.session) setSuccess('Check your email to confirm your account.')
    } else {
      setLoading(true)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() })
      setLoading(false)
      if (resetError) setError(resetError.message)
      else setSuccess('If that email has an account, a reset link is on its way.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">
          {mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Reset password'}
        </h1>

        {urlNotice && <p className="text-green-400 text-center mb-4 bg-slate-700 rounded p-3">{urlNotice}</p>}
        {success && !error && <p className="text-green-400 text-center mb-4 bg-slate-700 rounded p-3">{success}</p>}

        <div className="flex justify-center gap-4 mb-6">
          {[['signIn', 'Sign in'], ['signUp', 'Create account'], ['forgotPassword', 'Forgot password']].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m as Mode)}
              className={`text-xs ${mode === m ? 'text-white font-semibold border-b border-white' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signUp' && (
            <div><label htmlFor="dn" className="block text-gray-400 text-sm mb-1">Display name</label>
              <input id="dn" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-[11px] text-white focus:outline-none focus:border-blue-500" /></div>
          )}

          <div><label htmlFor="email" className="block text-gray-400 text-sm mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-[11px] text-white focus:outline-none focus:border-blue-500" /></div>

          {mode !== 'forgotPassword' && (
            <div><label htmlFor="pw" className="block text-gray-400 text-sm mb-1">Password</label>
              <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} required
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-[11px] text-white focus:outline-none focus:border-blue-500" /></div>
          )}

          {mode === 'signIn' && (
            <p className="text-xs text-gray-400"><button type="button" onClick={() => setMode('forgotPassword')} className="hover:text-white">Forgot password?</button></p>
          )}

          <button type="submit" disabled={loading}
            className={`w-full py-3 rounded font-semibold text-white ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {loading ? 'Please wait...' : mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Send reset link'}
          </button>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  )
}
