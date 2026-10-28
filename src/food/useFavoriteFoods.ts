import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProfile } from '../household/useProfile'
import type { FoodRowFromDb } from './recents'
import { foodResultFromRow } from './recents'

export function useFavoriteFoods() {
  const { profile } = useProfile()
  const householdId = profile?.household_id

  return useQuery({
    queryKey: ['favorite-foods', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('household_id', householdId!)
        .eq('is_favorite', true)
        .neq('source', 'custom')
        .order('name')

      if (error) throw new Error(error.message)
      return (data as FoodRowFromDb[]).map(foodResultFromRow)
    },
  })
}
