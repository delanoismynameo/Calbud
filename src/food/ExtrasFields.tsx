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
  const [open, setOpen] = useState(() =>
    EXTRAS.some((info) => {
      const v = values[info.key]
      return v !== undefined && v.trim() !== ''
    })
  )

  useEffect(() => {
    if (Object.keys(errors).length > 0) setOpen(true)
  }, [errors])

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm text-blue-400 text-left mb-1"
        aria-expanded={open}
      >
        More nutrients (optional) {open ? '▴' : '▾'}
      </button>

      {Object.keys(errors).length > 0 && !open && (
        <p className="text-red-400 text-xs mb-1">Check the nutrients below.</p>
      )}

      {open && (
        <>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {EXTRAS.map((info) => {
              const key = info.key
              return (
                <div key={key}>
                  <label htmlFor={'extra-' + key} className="block text-gray-400 text-sm mb-1">
                    {info.label} ({info.unit})
                  </label>
                  <input
                    id={'extra-' + key}
                    type="text"
                    inputMode="decimal"
                    value={values[key] ?? ''}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  {errors[key] && (
                    <p className="text-red-400 text-xs mt-1">{errors[key]}</p>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-gray-500 text-xs mt-2">Per serving, from the label. Leave blank what you don&apos;t know.</p>
        </>
      )}
    </div>
  )
}
