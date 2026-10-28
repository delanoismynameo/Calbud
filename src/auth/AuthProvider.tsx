import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  recovery: boolean
  urlNotice: string | null
  clearRecovery: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)
  const [urlNotice, setUrlNotice] = useState<string | null>(null)

  const clearRecovery = useCallback(() => setRecovery(false), [])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Check URL params after first session check
    const params = new URLSearchParams(window.location.search)
    const errorDesc = params.get('error_description')
    if (errorDesc) {
      setUrlNotice(decodeURIComponent(errorDesc))
      history.replaceState(null, '', window.location.pathname + window.location.hash)
    } else if (params.has('code')) {
      setUrlNotice('Your email is confirmed. Sign in to continue.')
      history.replaceState(null, '', window.location.pathname + window.location.hash)
    }

    const sub = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, s: Session | null) => {
      if (_event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
    })

    unsubscribe = () => {
      sub.data.subscription.unsubscribe()
    }

    return () => {
      unsubscribe?.()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, recovery, urlNotice, clearRecovery }}>
      {children}
    </AuthContext.Provider>
  )
}
