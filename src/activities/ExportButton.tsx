import { downloadFile } from '../lib/download'
import { useState } from 'react'
import { useProfile } from '../household/useProfile'
import type { Activity } from './types'
import { buildIcs } from '../calendar/ics'
import { activityEvents, exportFileName, isPhoneOrTablet, deliverIcs, type ShareNav } from '../calendar/exportWeek'
import { toGoogleCalendarUrl } from '../calendar/googleCalendar'

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
  
  const events = activityEvents(items, names, prefixNames)
  const googleLinks = events.map((event) => ({
    title: event.title,
    url: toGoogleCalendarUrl(event, profile.timezone),
  }))

  const handleClick = async () => {
    setMessage(null)
    setFailed(false)
    try {
      const text = buildIcs(events, { timeZone: profile.timezone, now: new Date(), calendarName: 'Calbud' })
      const file = new File([text], exportFileName(start), { type: 'text/calendar;charset=utf-8' })

      const preferShare = isPhoneOrTablet(navigator.userAgent, navigator.maxTouchPoints)
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
        className="bg-coral-light text-link rounded-2xl font-semibold py-2 px-4 text-xs inline-block disabled:opacity-40 hover:bg-coral-deeper"
      >
        Export week
      </button>
      <p className="text-xs text-muted mt-1">
        On a phone, use the share sheet to import into Calendar. On a computer, import the downloaded file in Google Calendar's web Settings.
      </p>
      {message && (
        <p className={`text-xs mt-1 ${failed ? 'text-danger' : 'text-muted'}`}>
          {message}
        </p>
      )}
      
      {items.length > 0 && (
        <div className="mt-3 px-3">
          <p className="text-xs text-muted mb-2">
            Tap each activity to add it to Google Calendar.
          </p>
          <ul className="space-y-1">
            {googleLinks.map((link, index) => (
              <li key={events[index].uid}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener"
                  className="text-xs text-link hover:underline block truncate"
                  title={link.title}
                >
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}