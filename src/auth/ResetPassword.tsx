import { useState, FormEvent } from 'react'
import { useAuth } from './AuthProvider'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const { clearRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) setError(updateError.message)
    else clearRecovery()
  }

  return (
    <div className="min-h-screen bg-cream text-ink mx-auto max-w-md px-6 py-10">
      <div className="bg-card rounded-3xl shadow-card p-6 space-y-4">
        <h1 className="text-[26px] font-extrabold tracking-tight text-center mb-6 text-ink">Set new password</h1>

        {error && (
          <p className="text-danger text-sm text-center bg-coral-light/50 rounded-2xl p-4">{error}</p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="newPassword" className="block text-muted text-sm mb-1">New password</label>
            <input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-muted text-sm mb-1">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-2xl font-bold ${loading ? 'cursor-not-allowed bg-coral-light/50 text-muted' : 'bg-coral-deep hover:bg-coral-deeper text-white'}`}
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
