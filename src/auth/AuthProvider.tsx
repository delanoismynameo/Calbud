import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'

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

    // getSession waits for supabase-js to finish exchanging any ?code= in the URL,
    // so the query string is only inspected and cleared after that.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)

      const params = new URLSearchParams(window.location.search)
      const errorDesc = params.get('error_description')
      if (errorDesc) setUrlNotice(errorDesc)
      else if (params.has('code') && !data.session) setUrlNotice('Your email is confirmed. Sign in to continue.')
      if (errorDesc || params.has('code')) {
        history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
    })

    const sub = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, s: Session | null) => {
      if (_event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (_event === 'SIGNED_OUT') queryClient.clear()
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
