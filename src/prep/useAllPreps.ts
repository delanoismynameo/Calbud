import { useQuery } from '@tanstack/react-query'
import type { MealPrep } from './types'
import { fetchAllPreps } from './prepApi'
import { useProfile } from '../household/useProfile'

export function useAllPreps() {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useQuery({
    queryKey: ['meal-prep', householdId, 'all'] as [string, string | null, string],
    enabled: !!householdId,
    queryFn: () => fetchAllPreps(householdId!),
  })
}
