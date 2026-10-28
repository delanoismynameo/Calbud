import { useQuery } from '@tanstack/react-query'
import type { MealPrep } from './types'
import { fetchPrepWeek } from './prepApi'
import { useProfile } from '../household/useProfile'

export function usePrepWeek(start: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useQuery({
    queryKey: ['meal-prep', householdId, start] as [string, string | null, string],
    enabled: !!householdId,
    queryFn: () => fetchPrepWeek(householdId!, start),
  })
}
