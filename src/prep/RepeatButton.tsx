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

  if (!profile?.household_id) return null

  const repeatMutation = useMutation({
    mutationFn: async () => {
      const last = addDays(start, -7)
      if (kind === 'menu') {
        const [lastWeek, thisWeek] = await Promise.all([
          fetchMenuWeek(profile.household_id!, last),
          fetchMenuWeek(profile.household_id!, start),
        ])
        const rows = repeatMenuRows(lastWeek, thisWeek)
        if (rows.length === 0) return null as never
        await saveSlots(profile.household_id!, rows)
        return rows.length
      }
      const [lastWeek, thisWeek] = await Promise.all([
        fetchPrepWeek(profile.household_id!, last),
        fetchPrepWeek(profile.household_id!, start),
      ])
      const rows = repeatPrepRows(lastWeek, thisWeek)
      if (rows.length === 0) return null as never
      await insertPreps(profile.household_id!, session!.user.id, rows)
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

  const handleClick = () => {
    repeatMutation.mutate()
  }

  return (
    <div className="px-3 py-3 text-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={repeatMutation.isPending}
        className="text-sm text-blue-400 underline disabled:opacity-50"
      >
        {repeatMutation.isPending ? 'Copying…' : 'Repeat last week'}
      </button>
      {message && <p className={`text-xs mt-1 ${repeatMutation.isError ? 'text-red-400' : 'text-gray-400'}`}>{message}</p>}
    </div>
  )
}
