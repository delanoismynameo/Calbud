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

  const exportCsv = async () => {
    setMessage(null)
    setFailed(false)
    setBusy('csv')
    try {
      const logs = await allRows('meal_logs', 'logged_on', 'user_id', session.user.id) as unknown as MealLog[]
      const file = new File([mealLogsCsv(logs)], dataFileName('csv', today), { type: 'text/csv' })

      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
      const preferShare = isIosStandalone(navigator.userAgent, navigator.maxTouchPoints, standalone)
      const result = await deliverIcs(file, preferShare, navigator as unknown as ShareNav, downloadFile, 'Calbud data')

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await fetchAllData(session.user.id)
      const file = new File([JSON.stringify(data, null, 2)], dataFileName('json', today), { type: 'application/json' })

      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
      const preferShare = isIosStandalone(navigator.userAgent, navigator.maxTouchPoints, standalone)
      const result = await deliverIcs(file, preferShare, navigator as unknown as ShareNav, downloadFile, 'Calbud data')

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
    <div className="bg-slate-800 rounded-lg p-4 text-left space-y-3">
      <p className="text-sm font-semibold text-gray-400">Your data</p>
      <p className="text-xs text-gray-500">Download what you&apos;ve logged. The food log opens in a spreadsheet; the full file has everything.</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={exportCsv}
          className="py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800 disabled:opacity-50"
        >
          {busy === 'csv' ? 'Preparing…' : 'Food log (CSV)'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={exportJson}
          className="py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800 disabled:opacity-50"
        >
          {busy === 'json' ? 'Preparing…' : 'Everything (JSON)'}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${failed ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
      )}
    </div>
  )
}
