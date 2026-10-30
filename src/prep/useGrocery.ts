import { useQuery, useMutation } from '@tanstack/react-query'
import type { GroceryItem } from './grocery'
import { fetchGroceryExtras, upsertGroceryExtras, deleteGroceryExtra, fetchGroceryTicks, addGroceryTicks, removeGroceryTick, clearGroceryTicks } from './groceryApi'
import { queryClient } from '../lib/queryClient'
import { useProfile } from '../household/useProfile'
import { mergeExtras } from './extras'

export function useGroceryExtras(weekStart: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useQuery({
    queryKey: ['grocery-extras', householdId, weekStart] as [string, string | null, string],
    enabled: !!householdId,
    queryFn: () => fetchGroceryExtras(householdId!, weekStart),
  })
}

export function useGroceryTicks(weekStart: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useQuery({
    queryKey: ['grocery-ticks', householdId, weekStart] as [string, string | null, string],
    enabled: !!householdId,
    queryFn: () => fetchGroceryTicks(householdId!, weekStart),
  })
}

export function useAddGroceryExtras(weekStart: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useMutation({
    mutationFn: async (added: GroceryItem[]) => {
      if (!householdId) throw new Error('Join or create a household first.')
      // Read fresh: the cache is empty when this runs from the Recipes tab.
      const current = await fetchGroceryExtras(householdId, weekStart)
      const merged = mergeExtras(current, added)
      await upsertGroceryExtras(householdId, weekStart, merged)
    },
    onSuccess: async () => {
      if (!householdId) return
      void queryClient.invalidateQueries({ queryKey: ['grocery-extras', householdId, weekStart] })
    },
  })
}

export function useRemoveGroceryExtra(weekStart: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useMutation({
    mutationFn: async (key: string) => {
      if (!householdId) throw new Error('Join or create a household first.')
      await deleteGroceryExtra(householdId, weekStart, key)
    },
    onSuccess: async () => {
      if (!householdId) return
      void queryClient.invalidateQueries({ queryKey: ['grocery-extras', householdId, weekStart] })
    },
  })
}

export function useToggleGroceryTick(weekStart: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useMutation({
    mutationFn: async ({ key, ticked }: { key: string; ticked: boolean }) => {
      if (!householdId) throw new Error('Join or create a household first.')
      if (ticked) {
        await addGroceryTicks(householdId, weekStart, [key])
      } else {
        await removeGroceryTick(householdId, weekStart, key)
      }
    },
    onMutate: async ({ key, ticked }) => {
      if (!householdId) return null
      await queryClient.cancelQueries({ queryKey: ['grocery-ticks', householdId, weekStart] })
      const previous = queryClient.getQueryData<string[]>(['grocery-ticks', householdId, weekStart]) ?? []
      const updated = ticked ? [...previous, key] : previous.filter(k => k !== key)
      queryClient.setQueryData(['grocery-ticks', householdId, weekStart], updated)
      return { previous } as { previous: string[] }
    },
    onError: (_err, __, context) => {
      if (context?.previous && householdId) {
        queryClient.setQueryData(['grocery-ticks', householdId, weekStart], context.previous)
      }
    },
    onSettled: async () => {
      if (!householdId) return
      void queryClient.invalidateQueries({ queryKey: ['grocery-ticks', householdId, weekStart] })
    },
  })
}

export function useSetGroceryTicks(weekStart: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useMutation({
    mutationFn: async (keys: string[]) => {
      if (!householdId) throw new Error('Join or create a household first.')
      await addGroceryTicks(householdId, weekStart, keys)
    },
    onSuccess: async () => {
      if (!householdId) return
      void queryClient.invalidateQueries({ queryKey: ['grocery-ticks', householdId, weekStart] })
    },
  })
}

export function useClearGroceryTicks(weekStart: string) {
  const { profile } = useProfile()
  const householdId = profile?.household_id ?? null

  return useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error('Join or create a household first.')
      await clearGroceryTicks(householdId, weekStart)
    },
    onSuccess: async () => {
      if (!householdId) return
      void queryClient.invalidateQueries({ queryKey: ['grocery-ticks', householdId, weekStart] })
    },
  })
}
