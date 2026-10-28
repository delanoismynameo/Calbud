import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { fetchMealLogs } from './mealLogApi'

export function useMealLogs(date: string) {
  const { session } = useAuth()
  const userId = session?.user.id

  return useQuery({
    queryKey: ['meal-logs', userId, date],
    enabled: !!userId,
    queryFn: () => fetchMealLogs(userId!, date),
  })
}
