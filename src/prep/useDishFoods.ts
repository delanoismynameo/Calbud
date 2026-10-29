import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProfile } from '../household/useProfile'
import type { FoodRowFromDb } from '../food/recents'

export function useDishFoods() {
  const { profile } = useProfile()
  const householdId = profile?.household_id

  return useQuery({
    queryKey: ['custom-foods', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('household_id', householdId!)
        .eq('source', 'custom')
        .order('name')

      if (error) throw new Error(error.message)
      return data as FoodRowFromDb[]
    },
  })
}
