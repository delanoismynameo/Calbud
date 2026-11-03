import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../household/useProfile'
import { isReminderDue } from './notifications'

export interface ReminderToast {
  id: string
  title: string
  message: string
  duration?: number
}

const CHECK_EVERY_MS = 15_000

function localDay(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

/**
 * Shows an in-app toast once a day when this person's meal reminder time
 * arrives while the app is open. No browser permission is needed for it;
 * phone push (for a locked phone) is a separate opt-in on the Us screen.
 */
export function useNotifications() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const uid = session?.user.id
  const reminder = profile?.reminder_time ?? null
  const [messages, setMessages] = useState<ReminderToast[]>([])
  const shownDay = useRef<string | null>(null)

  useEffect(() => {
    if (!uid || !reminder) return

    const check = () => {
      const now = new Date()
      if (!isReminderDue(reminder, now.getHours() * 60 + now.getMinutes())) return

      const day = localDay(now)
      const key = `calbud-reminder-${uid}`
      if (shownDay.current === day) return
      try {
        if (localStorage.getItem(key) === day) {
          shownDay.current = day
          return
        }
        localStorage.setItem(key, day)
      } catch {
        // storage blocked: the ref still stops repeats until the app reloads
      }
      shownDay.current = day

      setMessages([{
        id: `${uid}-${day}`,
        title: 'Meal reminder',
        message: 'Time to log your meal.',
        duration: 15000,
      }])
    }

    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => clearInterval(timer)
  }, [uid, reminder])

  const onDismissed = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  return { messages, onDismissed }
}
