import { useState } from 'react'
import { useProfile } from '../household/useProfile'
import type { Activity } from './types'
import { buildIcs } from '../calendar/ics'
import { activityEvents, exportFileName, isIosStandalone, deliverIcs, type ShareNav } from '../calendar/exportWeek'

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ExportButton({
  items,
  start,
  prefixNames,
}: {
  items: Activity[]
  start: string
  prefixNames: boolean
}) {
  const { profile, partner } = useProfile()
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  if (!profile) return null

  const names: Record<string, string> = {
    [profile.id]: profile.display_name,
  }
  if (partner) {
    names[partner.id] = partner.display_name
  }

  const handleClick = async () => {
    setMessage(null)
    setFailed(false)
    try {
      const events = activityEvents(items, names, prefixNames)
      const text = buildIcs(events, { timeZone: profile.timezone, now: new Date(), calendarName: 'Calbud' })
      const file = new File([text], exportFileName(start), { type: 'text/calendar' })

      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
      const preferShare = isIosStandalone(navigator.userAgent, navigator.maxTouchPoints, standalone)
      const result = await deliverIcs(file, preferShare, navigator as unknown as ShareNav, downloadFile)

      if (result !== 'cancelled') {
        setMessage(
          `Exported ${events.length} ${events.length === 1 ? 'activity' : 'activities'}.`,
        )
      }
    } catch (err) {
      setFailed(true)
      setMessage((err as Error).message)
    }
  }

  return (
    <div className="px-3 py-3 text-center">
      <button
        type="button"
        disabled={items.length === 0}
        onClick={handleClick}
        className="text-sm text-blue-400 underline disabled:opacity-40"
      >
        Export week
      </button>
      <p className="text-xs text-gray-500 mt-1">
        Import the file into a Calbud calendar. In Google Calendar: Settings, then Import &amp; export, then Import.
      </p>
      {message && (
        <p className={`text-xs mt-1 ${failed ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
