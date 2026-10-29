import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'

export function usePrepRealtime(householdId: string | null | undefined): void {
  useEffect(() => {
    if (!householdId) return

    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['meal-prep'] }) }
    const refreshMenu = () => { void queryClient.invalidateQueries({ queryKey: ['menu'] }) }

    const channel = supabase
      .channel(`meal-prep-${householdId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meal_prep', filter: `household_id=eq.${householdId}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meal_prep', filter: `household_id=eq.${householdId}` }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meal_prep' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'menu_slots', filter: `household_id=eq.${householdId}` }, refreshMenu)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'menu_slots', filter: `household_id=eq.${householdId}` }, refreshMenu)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'menu_slots' }, refreshMenu)
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId])
}
