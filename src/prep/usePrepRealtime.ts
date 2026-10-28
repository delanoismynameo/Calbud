import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'

export function usePrepRealtime(householdId: string | null | undefined): void {
  useEffect(() => {
    if (!householdId) return

    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['meal-prep'] }) }

    const channel = supabase
      .channel(`meal-prep-${householdId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meal_prep', filter: `household_id=eq.${householdId}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meal_prep', filter: `household_id=eq.${householdId}` }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meal_prep' }, refresh)
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId])
}
