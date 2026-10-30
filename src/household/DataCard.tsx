import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useLocalDate } from '../lib/useLocalDate'
import { downloadFile } from '../lib/download'
import { isIosStandalone, deliverIcs, type ShareNav } from '../calendar/exportWeek'
import { allRows, fetchAllData } from './exportApi'
import { mealLogsCsv, dataFileName } from './dataExport'
import type { MealLog } from '../today/types'

export default function DataCard() {
  const { session } = useAuth()
  const today = useLocalDate()
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  if (!session) return null

  // Shares on an installed iPhone app (downloads are unreliable there), downloads everywhere else.
  const deliver = (file: File) => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    const preferShare = isIosStandalone(navigator.userAgent, navigator.maxTouchPoints, standalone)
    return deliverIcs(file, preferShare, navigator as unknown as ShareNav, downloadFile, 'Calbud data')
  }

  const exportCsv = async () => {
    setMessage(null)
    setFailed(false)
    setBusy('csv')
    try {
      const logs = await allRows('meal_logs', 'logged_on', 'user_id', session.user.id) as unknown as MealLog[]
      const file = new File([mealLogsCsv(logs)], dataFileName('csv', today), { type: 'text/csv' })

      const result = await deliver(file)

      if (result !== 'cancelled') {
        setMessage(`Downloaded ${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}.`)
      }
    } catch (err) {
      setFailed(true)
      setMessage((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const exportJson = async () => {
    setMessage(null)
    setFailed(false)
    setBusy('json')
    try {
      const data = await fetchAllData(session.user.id)
      const file = new File([JSON.stringify(data, null, 2)], dataFileName('json', today), { type: 'application/json' })

      const result = await deliver(file)

      if (result !== 'cancelled') {
        setMessage('Downloaded everything.')
      }
    } catch (err) {
      setFailed(true)
      setMessage((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-card rounded-3xl shadow-card p-5">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-section">Your data</p>
      <p className="text-xs text-muted mb-4">Download what you&apos;ve logged. The food log opens in a spreadsheet; the full file has everything.</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={exportCsv}
          className="py-3 rounded-2xl border border-line bg-card hover:bg-coral-light font-semibold text-ink disabled:opacity-50"
        >
          {busy === 'csv' ? 'Preparing…' : 'Food log (CSV)'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={exportJson}
          className="py-3 rounded-2xl border border-line bg-card hover:bg-coral-light font-semibold text-ink disabled:opacity-50"
        >
          {busy === 'json' ? 'Preparing…' : 'Everything (JSON)'}
        </button>
      </div>
      {message && (
        <p className={`text-xs mt-2 ${failed ? 'text-danger' : 'text-link'}`}>{message}</p>
      )}
    </div>
  )
}
