import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { Profile, Household } from '../lib/types'

interface ProfileResult {
  profile: Profile
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
    return { profile: userProf, household: null, partner: null }
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

  return { profile: userProf, household: hh, partner: partRes.data }
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

  return {
    profile: query.data?.profile ?? null,
    household: query.data?.household ?? null,
    partner: query.data?.partner ?? null,
    loading: query.isPending,
    error: query.isError && !query.data ? query.error.message : null,
    refresh: async () => { await query.refetch() },
  }
}
