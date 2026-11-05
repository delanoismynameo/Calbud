import { useState, type KeyboardEvent } from 'react'
import { convertUnits, convertAmount } from './convert'

// A Convert button for an amount box: pick a unit, type how much, and Use hands back the amount in g or ml.
export default function ConvertPopup({ unit, onConvert }: { unit: 'g' | 'ml'; onConvert: (amount: number) => void }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(0)
  const [text, setText] = useState('')

  const units = convertUnits(unit)
  const chosen = units[picked] ?? units[0]
  const converted = convertAmount(text, chosen.per)

  const close = () => { setOpen(false); setText('') }
  const use = () => {
    if (converted == null) return
    onConvert(converted)
    close()
  }
  // Enter would otherwise submit the form around this box.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    use()
  }

  const field = 'w-full bg-card border border-line rounded-xl text-ink px-2 py-1.5 mt-1 focus:outline-none focus:ring-2 focus:ring-coral'

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="text-sm font-semibold text-link bg-coral-light rounded-xl px-3 py-2">
        Convert
      </button>

      {open && (
        <div className="absolute z-10 right-0 top-full mt-1 w-56 bg-cream border border-line rounded-xl shadow-card p-3 space-y-2">
          <label className="block text-xs text-muted">
            Convert from
            <select value={picked} onChange={(e) => setPicked(Number(e.target.value))} className={field}>
              {units.map((u, i) => <option key={u.label} value={i}>{u.label}</option>)}
            </select>
          </label>
          <label className="block text-xs text-muted">
            How many {chosen.label}
            <input type="text" inputMode="decimal" autoFocus value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown} className={field} />
          </label>
          {converted != null && <p className="text-sm text-muted">= {converted} {unit}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={use} disabled={converted == null}
              className="flex-1 py-1.5 rounded-xl bg-coral-deep hover:bg-coral-deeper text-white font-semibold text-sm disabled:opacity-50">
              Use
            </button>
            <button type="button" onClick={close} className="py-1.5 px-3 rounded-xl text-link text-sm font-semibold hover:bg-coral-light">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
