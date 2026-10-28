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

  const userId = session?.user.id

  // Loads own profile, then household and partner. loading only covers the first load.
  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const { data: userProf, error: profErr } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      if (profErr) { setError(profErr.message); return }

      let hh: Household | null = null
      let part: Profile | null = null
      if (userProf.household_id) {
        const hhRes = await supabase
          .from('households').select('*').eq('id', userProf.household_id).single()
        if (hhRes.error) { setError(hhRes.error.message); return }
        const partRes = await supabase
          .from('profiles').select('*')
          .eq('household_id', userProf.household_id).neq('id', userId).maybeSingle()
        if (partRes.error) { setError(partRes.error.message); return }
        hh = hhRes.data
        part = partRes.data
      }

      setProfile(userProf)
      setHousehold(hh)
      setPartner(part)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

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
