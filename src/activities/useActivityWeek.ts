import { useQuery } from '@tanstack/react-query'
import type { Activity } from './types'
import { fetchActivityWeek } from './activitiesApi'
import { useProfile } from '../household/useProfile'

export function useActivityWeek(start: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useQuery({
    queryKey: ['activities', start],
    enabled: !!householdId,
    queryFn: () => fetchActivityWeek(start),
  })
}
