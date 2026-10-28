import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { Profile, Household } from '../lib/types'

interface ProfileResult {
  profile: Profile | null
  household: Household | null
  partner: Profile | null
}

async function queryFn(userId: string): Promise<ProfileResult> {
  const { data: userProf, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (profErr) throw new Error(profErr.message)

  if (!userProf.household_id) {
    return { profile: userProf, household: null, partner: null } as ProfileResult
  }

  const { data: hh, error: hhErr } = await supabase
    .from('households')
    .select('*')
    .eq('id', userProf.household_id)
    .single()
  if (hhErr) throw new Error(hhErr.message)

  const partRes = await supabase
    .from('profiles')
    .select('*')
    .eq('household_id', userProf.household_id)
    .neq('id', userId)
    .maybeSingle()
  if (partRes.error) throw new Error(partRes.error.message)

  return { profile: userProf, household: hh, partner: partRes.data } as ProfileResult
}

export function useProfile(): {
  profile: Profile | null
  household: Household | null
  partner: Profile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const { session } = useAuth()
  const userId = session?.user.id

  const query = useQuery({
    queryKey: ['household-data', userId],
    enabled: !!userId,
    queryFn: () => {
      if (!userId) throw new Error('no user')
      return queryFn(userId)
    },
  })

  const data = query.data ?? { profile: null, household: null, partner: null }

  return {
    profile: data.profile,
    household: data.household,
    partner: data.partner,
    loading: query.isPending,
    error: (query.isError && !query.data) ? String(query.error) : null,
    refresh: async () => { await query.refetch() },
  }
}
