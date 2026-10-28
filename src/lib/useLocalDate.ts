import { useState, useEffect } from 'react'
import { localDateString } from './dates'

export function useLocalDate(): string {
  const [date, setDate] = useState(localDateString)

  useEffect(() => {
    const interval = setInterval(() => {
      const next = localDateString()
      if (next !== date) setDate(next)
    }, 60_000)

    const handleVisibility = () => {
      const next = localDateString()
      if (next !== date) setDate(next)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [date])

  return date
}
