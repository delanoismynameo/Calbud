import { useState, FormEvent, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '../lib/supabase'
import { authRedirectUrl } from '../lib/supabase'

type Mode = 'signIn' | 'signUp' | 'forgotPassword'

export default function AuthScreen() {
  const { urlNotice } = useAuth()
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
    <div className="min-h-screen bg-cream text-ink mx-auto max-w-md px-6 py-10">
      <div className="bg-card rounded-3xl shadow-card p-6 space-y-4">
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink text-center mb-6">
          {mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Reset password'}
        </h1>

        {urlNotice && <p className="text-muted text-sm text-center bg-coral-light/50 rounded-2xl p-4">{urlNotice}</p>}
        {success && !error && <p className="text-muted text-sm text-center bg-coral-light/50 rounded-2xl p-4">{success}</p>}

        <div className="flex justify-center gap-4 mb-6">
          {[['signIn', 'Sign in'], ['signUp', 'Create account'], ['forgotPassword', 'Forgot password']].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m as Mode)}
              className={`text-xs text-link ${mode === m ? 'font-bold underline underline-offset-4' : 'opacity-70 hover:opacity-100'}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signUp' && (
            <div><label htmlFor="dn" className="block text-muted text-sm mb-1">Display name</label>
              <input id="dn" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name"
                className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" /></div>
          )}

          <div><label htmlFor="email" className="block text-muted text-sm mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required
              className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" /></div>

          {mode !== 'forgotPassword' && (
            <div><label htmlFor="pw" className="block text-muted text-sm mb-1">Password</label>
              <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} required
                className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral" /></div>
          )}

          {mode === 'signIn' && (
            <p className="text-xs text-muted"><button type="button" onClick={() => setMode('forgotPassword')} className="font-semibold text-link hover:underline">Forgot password?</button></p>
          )}

          <button type="submit" disabled={loading}
            className={`w-full py-3 rounded-2xl font-bold ${loading ? 'cursor-not-allowed bg-coral-light/50 text-muted' : 'bg-coral-deep hover:bg-coral-deeper text-white'}`}>
            {loading ? 'Please wait...' : mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Send reset link'}
          </button>

          {error && <p className="text-danger text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  )
}
