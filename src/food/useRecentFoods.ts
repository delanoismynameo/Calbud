import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { RecentLogRow } from './recents'
import { recentFoods } from './recents'

export function useRecentFoods() {
  const { session } = useAuth()
  const userId = session?.user.id

  return useQuery({
    queryKey: ['recent-foods', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_logs')
        .select('food_id, foods(*)')
        .eq('user_id', userId!)
        .not('food_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)
      return recentFoods(data as unknown as RecentLogRow[])
    },
  })
}
