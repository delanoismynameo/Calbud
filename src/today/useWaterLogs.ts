import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { fetchWaterLogs } from './waterLogApi'

export function useWaterLogs(date: string) {
  const { session } = useAuth()
  const userId = session?.user.id

  return useQuery({
    queryKey: ['water-logs', userId, date],
    enabled: !!userId,
    queryFn: () => fetchWaterLogs(userId!, date),
  })
}