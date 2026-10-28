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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">Set new password</h1>

        {error && (
          <p className="text-red-400 text-center mb-4 bg-slate-700 rounded p-3">{error}</p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="newPassword" className="block text-gray-400 text-sm mb-1">New password</label>
            <input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-[11px] text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-gray-400 text-sm mb-1">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-[11px] text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded font-semibold text-white ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
