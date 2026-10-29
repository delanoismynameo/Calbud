import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { addDays } from '../prep/week'
import { kcalByUserDay } from './stats'
import { fetchHouseholdKcal } from './kcalApi'

// The last 60 days (addDays(today, -59) to today) of household kcal, grouped with kcalByUserDay.
export function useHouseholdKcal(today: string) {
  const { session } = useAuth()

  const from = addDays(today, -59)
  const to = today

  return useQuery({
    queryKey: ['meal-logs', 'household', from, to],
    enabled: !!session,
    queryFn: async () => kcalByUserDay(await fetchHouseholdKcal(from, to)),
  })
}
