import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { Profile, Household } from '../lib/types'

interface ProfileContextValue {
  profile: Profile | null
  household: Household | null
  partner: Profile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [partner, setPartner] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    const userId = session.user.id

    const { data: userProf, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profErr) { setError(profErr.message); return }
    setProfile(userProf)

    if (userProf.household_id) {
      const { data: hh, error: hhErr } = await supabase
        .from('households')
        .select('*')
        .eq('id', userProf.household_id)
        .single()
      setHousehold(hh ?? null)
      if (hhErr) setError(hhErr.message)

      const { data: part, error: partErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('household_id', hh?.id ?? '')
        .neq('id', userId)
        .maybeSingle()
      setPartner(part ?? null)
    } else {
      setHousehold(null)
      setPartner(null)
    }

    if (!profErr) setError(null)
  }, [session])

  const firstLoadRef = useState(true)[0]

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => { setLoading(false) }, [])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  return (
    <ProfileContext.Provider value={{ profile, household, partner, loading, error, refresh }}>
      {children}
    </ProfileContext.Provider>
  )
}
