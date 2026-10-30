import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { fetchMenuWeek, saveSlots } from '../menu/menuApi'
import { repeatMenuRows } from '../menu/menu'
import { queryClient } from '../lib/queryClient'
import { fetchPrepWeek, insertPreps } from './prepApi'
import { repeatPrepRows } from './repeat'
import { addDays } from './week'
import { useProfile } from '../household/useProfile'
import { useAuth } from '../auth/AuthProvider'

export default function RepeatButton({ kind, start }: { kind: 'menu' | 'prep'; start: string }) {
  const { profile } = useProfile()
  const { session } = useAuth()
  const [message, setMessage] = useState<string | null>(null)
  const householdId = profile?.household_id ?? null

  const repeatMutation = useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error('Join or create a household first.')
      const last = addDays(start, -7)
      if (kind === 'menu') {
        const [lastWeek, thisWeek] = await Promise.all([
          fetchMenuWeek(householdId, last),
          fetchMenuWeek(householdId, start),
        ])
        const rows = repeatMenuRows(lastWeek, thisWeek)
        if (rows.length === 0) return 0
        await saveSlots(householdId, rows)
        return rows.length
      }
      const [lastWeek, thisWeek] = await Promise.all([
        fetchPrepWeek(householdId, last),
        fetchPrepWeek(householdId, start),
      ])
      const rows = repeatPrepRows(lastWeek, thisWeek)
      if (rows.length === 0) return 0
      await insertPreps(householdId, session!.user.id, rows)
      return rows.length
    },
    onSuccess: async (count) => {
      await queryClient.invalidateQueries({ queryKey: ['menu'] })
      await queryClient.invalidateQueries({ queryKey: ['meal-prep'] })
      if (!count) {
        setMessage('Nothing to copy.')
      } else {
        const word = kind === 'menu' ? (count === 1 ? 'meal' : 'meals') : (count === 1 ? 'session' : 'sessions')
        setMessage(`Copied ${count} ${word}.`)
      }
    },
    onError: (err: Error) => {
      setMessage(err.message)
    },
  })

  if (!householdId) return null

  const handleClick = () => {
    setMessage(null)
    repeatMutation.mutate()
  }

  return (
    <div className="px-3 py-3 text-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={repeatMutation.isPending}
        className="text-sm bg-coral-light text-link rounded-2xl font-semibold px-3 py-1 disabled:opacity-50"
      >
        {repeatMutation.isPending ? 'Copying…' : 'Repeat last week'}
      </button>
      {message && <p className={`text-xs mt-1 ${repeatMutation.isError ? 'text-danger' : 'text-muted'}`}>{message}</p>}
    </div>
  )
}
