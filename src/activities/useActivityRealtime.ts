import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'

export function useActivityRealtime(householdId: string | null | undefined): void {
  useEffect(() => {
    if (!householdId) return

    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['activities'] }) }

    const channel = supabase
      .channel(`activities-${householdId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities' }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, refresh)
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId])
}
