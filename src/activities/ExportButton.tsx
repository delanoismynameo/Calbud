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
  const [showPanel, setShowPanel] = useState(false)
  const [showLinks, setShowLinks] = useState(false)

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

  const handleExportAll = async () => {
    setShowPanel(false)
    setShowLinks(false)
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

  const handleButtonClick = () => {
    setShowPanel((open) => !open)
    setShowLinks(false)
  }

  return (
    <div className="px-3 py-3 text-center">
      <button
        type="button"
        disabled={items.length === 0}
        onClick={handleButtonClick}
        className="bg-coral-light text-link rounded-2xl font-semibold py-2 px-4 text-xs inline-block disabled:opacity-40 hover:bg-coral-deeper"
      >
        Export week
      </button>
      <p className="text-xs text-muted mt-1">
        Choose how to add this week's activities to your calendar.
      </p>
      {message && (
        <p className={`text-xs mt-1 ${failed ? 'text-danger' : 'text-muted'}`}>
          {message}
        </p>
      )}

      {showPanel && items.length > 0 && (
        <div
          className="bg-card border border-line rounded-xl p-3 mt-2"
        >
          {!showLinks ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExportAll}
                className="w-full bg-coral-light text-link rounded-2xl font-semibold py-2 text-xs hover:bg-coral-deeper"
              >
                Add all to my calendar
              </button>
              <button
                type="button"
                onClick={() => setShowLinks(true)}
                className="w-full text-link underline text-xs hover:text-coral-deeper"
              >
                Add one by one
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted mb-2">
                Tap an activity to add it to Google Calendar.
              </p>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
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
      )}
    </div>
  )
}
