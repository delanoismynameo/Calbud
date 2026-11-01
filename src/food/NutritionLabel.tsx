import type { LabelRow } from './label'
import type { EditKey } from './labelEdit'
import { editUnit } from './labelEdit'
import { useState } from 'react'
import * as React from 'react'

function RowContent({ row }: { row: LabelRow }) {
  const paddingClass = row.indent === 1 ? 'pl-4' : row.indent === 2 ? 'pl-8' : ''
  const labelPart = <>{row.bold && <b>{row.label}</b>}{!row.bold && row.label} </>

  let leftContent: React.ReactNode
  if (row.amount != null) {
    const missingNote = row.missing != null && row.missing > 0 ? ` (${row.missing} without data)` : ''
    leftContent = <>
      {labelPart}
      {row.amount}
      {missingNote && <span className="text-xs text-muted">{missingNote}</span>}
    </>
  } else {
    leftContent = <>
      {labelPart}
      <span className="text-muted">no data</span>
    </>
  }

  let rightContent: React.ReactNode | null = null
  if (row.dv != null) {
    rightContent = <span className="font-bold">{row.dv}%</span>
  }

  return (
    <div className={`flex justify-between text-sm border-b border-muted py-0.5 ${paddingClass}`}>
      <span>{leftContent}</span>
      {rightContent}
    </div>
  )
}

function EditBox({ rowKey, values, onEdit, onCancel, label, unit }: {
  rowKey: EditKey
  values?: Partial<Record<EditKey, number>>
  onEdit?: (key: EditKey, value: number) => void
  onCancel?: () => void
  label: string
  unit: string
}) {
  const [text, setText] = useState(String(values?.[rowKey] ?? ''))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(text.replace(',', '.'))
    if (Number.isFinite(n) && n >= 0 && onEdit) {
      onEdit(rowKey, n)
      onCancel?.()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <span className="text-sm">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={`New value for ${label}`}
        className="w-20 bg-card border border-line rounded px-2 py-0.5 text-ink focus:outline-none focus:ring-2 focus:ring-coral"
      />
      <span className="text-sm">{unit}</span>
      <button type="submit" className="text-link font-semibold">Save</button>
      <button type="button" onClick={onCancel} className="text-muted">Cancel</button>
    </form>
  )
}

export default function NutritionLabel({ servingText, kcal, rows, servingName, note, values, onEdit, servingG, servingLabel, onEditServing }: {
  servingText: string
  kcal: number
  rows: LabelRow[]
  servingName?: string // left text of the serving line; default 'Serving size'
  note?: string // a text-xs mt-1 line after the footnote, only when given
  values?: Partial<Record<EditKey, number>>
  onEdit?: (key: EditKey, value: number) => void
  servingG?: number | null // grams in one serving, for editing
  servingLabel?: string | null // serving label (e.g., "1 cup"), for editing
  onEditServing?: (label: string, grams: number) => void // callback for serving edit
}) {
  const [editing, setEditing] = useState<EditKey | null>(null)
  const [editingServing, setEditingServing] = useState(false)
  const [servingTextLocal, setServingTextLocal] = useState(servingLabel ?? '')
  const [servingGramsLocal, setServingGramsLocal] = useState(String(servingG ?? ''))

  // Split rows into main and vitamins groups
  let sepIdx = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].group === 'vitamins') {
      sepIdx = i
      break
    }
  }

  const mainRows = sepIdx >= 0 ? rows.slice(0, sepIdx) : rows
  const vitaminRows = sepIdx >= 0 ? rows.slice(sepIdx) : []

  const editingKcal = editing === 'kcal'

  return (
    <div className="bg-card text-ink rounded p-3 border-2 border-ink">
      {/* Heading */}
      <h2 className="text-3xl font-extrabold leading-none">Nutrition Facts</h2>
      <div className="border-b border-ink pb-1" />

      {/* Serving line */}
      {onEditServing && editingServing ? (
        <div className="border-b border-muted py-0.5">
          <form onSubmit={(e) => { e.preventDefault(); const g = Number(servingGramsLocal.replace(',', '.')); if (Number.isFinite(g) && g > 0 && g <= 5000) { onEditServing(servingTextLocal, g); setEditingServing(false); } }}>
            <label htmlFor="serving-text-edit" className="block text-muted text-sm">Serving name</label>
            <input id="serving-text-edit" type="text" value={servingTextLocal} onChange={(e) => setServingTextLocal(e.target.value)} className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-2 focus:outline-none focus:ring-2 focus:ring-coral" />
            <div className="flex gap-2 mt-2">
              <label htmlFor="serving-grams-edit" className="block text-muted text-sm">Grams in one serving</label>
              <input id="serving-grams-edit" type="text" inputMode="decimal" value={servingGramsLocal} onChange={(e) => setServingGramsLocal(e.target.value)} className="w-20 bg-card border border-line rounded px-2 py-0.5 text-ink focus:outline-none focus:ring-2 focus:ring-coral" />
            </div>
            <div className="flex gap-3 mt-2">
              <button type="submit" className="text-link font-semibold">Save</button>
              <button type="button" onClick={() => setEditingServing(false)} className="text-muted">Cancel</button>
            </div>
          </form>
        </div>
      ) : onEditServing ? (
        <button type="button" onClick={() => { setServingTextLocal(servingLabel ?? ''); setServingGramsLocal(String(servingG ?? '')); setEditingServing(true) }} className="w-full text-left">
          <div className="flex justify-between text-sm font-bold mt-1">
            <span>{servingName ?? 'Serving size'}</span>
            <span>{servingText}</span>
          </div>
        </button>
      ) : (
        <div className="flex justify-between text-sm font-bold mt-1">
          <span>{servingName ?? 'Serving size'}</span>
          <span>{servingText}</span>
        </div>
      )}
      <div className="border-b-8 border-ink" />

      {/* Calories */}
      {onEdit && editingKcal ? (
        <div className="border-b-4 border-ink py-0.5">
          <EditBox
            rowKey="kcal"
            values={values}
            onEdit={onEdit}
            onCancel={() => setEditing(null)}
            label="Calories"
            unit="kcal"
          />
        </div>
      ) : onEdit ? (
        <button type="button" onClick={() => setEditing('kcal')} className="w-full text-left">
          <div className="flex justify-between items-end border-b-4 border-ink py-0.5">
            <span className="text-2xl font-extrabold">Calories</span>
            <span className="text-3xl font-extrabold">{kcal}</span>
          </div>
        </button>
      ) : (
        <div className="flex justify-between items-end border-b-4 border-ink py-0.5">
          <span className="text-2xl font-extrabold">Calories</span>
          <span className="text-3xl font-extrabold">{kcal}</span>
        </div>
      )}

      {/* % Daily Value header */}
      <div className="text-right text-xs font-bold border-b border-ink pb-0.5">
        % Daily Value<sup>*</sup>
      </div>

      {/* Main rows */}
      {mainRows.map((row) => (
        <React.Fragment key={row.key}>
          {onEdit && editing === row.key ? (
            <div className="border-b border-muted py-0.5">
              <EditBox
                rowKey={row.key as EditKey}
                values={values}
                onEdit={onEdit}
                onCancel={() => setEditing(null)}
                label={row.label}
                unit={editUnit(row.key as EditKey)}
              />
            </div>
          ) : onEdit ? (
            <button type="button" onClick={() => setEditing(row.key as EditKey)} className="w-full text-left">
              <RowContent row={row} />
            </button>
          ) : (
            <RowContent row={row} />
          )}
        </React.Fragment>
      ))}

      {/* Thick bar before vitamins */}
      {vitaminRows.length > 0 && (
        <>
          <div className="border-b-8 border-ink" />
          {vitaminRows.map((row) => (
            <React.Fragment key={row.key}>
              {onEdit && editing === row.key ? (
                <div className="border-b border-muted py-0.5">
                  <EditBox
                    rowKey={row.key as EditKey}
                    values={values}
                    onEdit={onEdit}
                    onCancel={() => setEditing(null)}
                    label={row.label}
                    unit={editUnit(row.key as EditKey)}
                  />
                </div>
              ) : onEdit ? (
                <button type="button" onClick={() => setEditing(row.key as EditKey)} className="w-full text-left">
                  <RowContent row={row} />
                </button>
              ) : (
                <RowContent row={row} />
              )}
            </React.Fragment>
          ))}
        </>
      )}

      {/* Footnote */}
      <p className="text-xs mt-1">* The % Daily Value shows how much of a day&apos;s amount the food gives, on a 2,000-calorie diet.</p>
      {note && <p className="text-xs mt-1">{note}</p>}
      {onEdit && <p className="text-xs text-muted mt-1">Tap a row to correct it.</p>}
    </div>
  )
}
