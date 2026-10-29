import type { LabelRow } from './label'

function RowContent({ row }: { row: LabelRow }) {
  const paddingClass = row.indent === 1 ? 'pl-4' : row.indent === 2 ? 'pl-8' : ''
  const labelPart = <>{row.bold && <b>{row.label}</b>}{!row.bold && row.label} </>

  let leftContent: React.ReactNode
  if (row.amount != null) {
    const missingNote = row.missing != null && row.missing > 0 ? ` (${row.missing} without data)` : ''
    leftContent = <>
      {labelPart}
      {row.amount}
      {missingNote && <span className="text-xs text-gray-500">{missingNote}</span>}
    </>
  } else {
    leftContent = <>
      {labelPart}
      <span className="text-gray-500">no data</span>
    </>
  }

  let rightContent: React.ReactNode | null = null
  if (row.dv != null) {
    rightContent = <span className="font-bold">{row.dv}%</span>
  }

  return (
    <div className={`flex justify-between text-sm border-b border-gray-400 py-0.5 ${paddingClass}`}>
      <span>{leftContent}</span>
      {rightContent}
    </div>
  )
}

export default function NutritionLabel({ servingText, kcal, rows, servingName, note }: {
  servingText: string
  kcal: number
  rows: LabelRow[]
  servingName?: string // left text of the serving line; default 'Serving size'
  note?: string // a text-xs mt-1 line after the footnote, only when given
}) {
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

  return (
    <div className="bg-white text-black rounded p-3 border-2 border-black">
      {/* Heading */}
      <h2 className="text-3xl font-extrabold leading-none">Nutrition Facts</h2>
      <div className="border-b border-black pb-1" />

      {/* Serving line */}
      <div className="flex justify-between text-sm font-bold mt-1">
        <span>{servingName ?? 'Serving size'}</span>
        <span>{servingText}</span>
      </div>
      <div className="border-b-8 border-black" />

      {/* Calories */}
      <div className="flex justify-between items-end border-b-4 border-black py-0.5">
        <span className="text-2xl font-extrabold">Calories</span>
        <span className="text-3xl font-extrabold">{kcal}</span>
      </div>

      {/* % Daily Value header */}
      <div className="text-right text-xs font-bold border-b border-black pb-0.5">
        % Daily Value<sup>*</sup>
      </div>

      {/* Main rows */}
      {mainRows.map((row) => (
        <RowContent key={row.key} row={row} />
      ))}

      {/* Thick bar before vitamins */}
      {vitaminRows.length > 0 && (
        <>
          <div className="border-b-8 border-black" />
          {vitaminRows.map((row) => (
            <RowContent key={row.key} row={row} />
          ))}
        </>
      )}

      {/* Footnote */}
      <p className="text-xs mt-1">* The % Daily Value shows how much of a day&apos;s amount the food gives, on a 2,000-calorie diet.</p>
      {note && <p className="text-xs mt-1">{note}</p>}
    </div>
  )
}
