import { useQuery } from '@tanstack/react-query'
import { fetchWaterLogs } from './waterLogApi'

// One person's water adds for one day (yours, or a household member's, read only).
export function useWaterLogs(userId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['water-logs', userId, date],
    enabled: !!userId,
    queryFn: () => fetchWaterLogs(userId!, date),
  })
}
