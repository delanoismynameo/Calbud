import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'

export function useGroceryRealtime(householdId: string | null | undefined): void {
  useEffect(() => {
    if (!householdId) return

    const refreshExtras = () => { void queryClient.invalidateQueries({ queryKey: ['grocery-extras'] }) }
    const refreshTicks = () => { void queryClient.invalidateQueries({ queryKey: ['grocery-ticks'] }) }

    const channel = supabase
      .channel(`grocery-${householdId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'grocery_extras', filter: `household_id=eq.${householdId}` }, refreshExtras)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'grocery_extras', filter: `household_id=eq.${householdId}` }, refreshExtras)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'grocery_extras' }, refreshExtras)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'grocery_ticks', filter: `household_id=eq.${householdId}` }, refreshTicks)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'grocery_ticks', filter: `household_id=eq.${householdId}` }, refreshTicks)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'grocery_ticks' }, refreshTicks)
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId])
}
