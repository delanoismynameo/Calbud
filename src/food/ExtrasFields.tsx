import { useState, useEffect } from 'react'
import type { ExtraInputs, ExtraKey } from './extras'
import { EXTRAS } from './extras'

export default function ExtrasFields({
  values,
  errors,
  onChange,
}: {
  values: ExtraInputs
  errors: Partial<Record<ExtraKey, string>>
  onChange: (key: ExtraKey, value: string) => void
}) {
  const hasValues = EXTRAS.some((info) => (values[info.key] ?? '').trim() !== '')
  const [open, setOpen] = useState(hasValues)

  // Cleared errors stay as undefined keys, so count only real messages.
  const hasErrors = Object.values(errors).some(Boolean)

  // Open when errors appear, or when values arrive later (picking a saved dish).
  useEffect(() => {
    if (hasErrors || hasValues) setOpen(true)
  }, [hasErrors, hasValues])

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-link ml-4 mb-1 text-sm"
        aria-expanded={open}
      >
        More nutrients (optional) {open ? '▴' : '▾'}
      </button>

      {hasErrors && !open && (
        <p className="text-danger text-xs mb-1">Check the nutrients below.</p>
      )}

      {open && (
        <>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {EXTRAS.map((info) => {
              const key = info.key
              return (
                <div key={key}>
                  <label htmlFor={'extra-' + key} className="block text-muted text-sm mb-1">
                    {info.label} ({info.unit})
                  </label>
                  <input
                    id={'extra-' + key}
                    type="text"
                    inputMode="decimal"
                    value={values[key] ?? ''}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                  {errors[key] && (
                    <p className="text-danger text-xs mt-1">{errors[key]}</p>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-muted text-xs mt-2">Per serving, from the label. Leave blank what you don&apos;t know.</p>
        </>
      )}
    </div>
  )
}
