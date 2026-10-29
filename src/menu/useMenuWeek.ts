import { useQuery } from '@tanstack/react-query'
import type { MenuSlot } from './types'
import { fetchMenuWeek } from './menuApi'
import { useProfile } from '../household/useProfile'

export function useMenuWeek(start: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useQuery({
    queryKey: ['menu', householdId, start] as [string, string | null, string],
    enabled: !!householdId,
    queryFn: () => fetchMenuWeek(householdId!, start),
  })
}
