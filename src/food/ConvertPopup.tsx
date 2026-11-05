import { useState } from 'react'
import type { FoodResult } from './types'

type WeightUnit = 'lb' | 'oz' | 'kg'
type LiquidUnit = 'fl-oz' | 'cup' | 'tbsp' | 'tsp'

const WEIGHT_UNITS: { code: WeightUnit; label: string; gramsPer: number }[] = [
  { code: 'lb', label: 'lb', gramsPer: 453.592 },
  { code: 'oz', label: 'oz', gramsPer: 28.3495 },
  { code: 'kg', label: 'kg', gramsPer: 1000 },
]

const LIQUID_UNITS: { code: LiquidUnit; label: string; mlPer: number }[] = [
  { code: 'fl-oz', label: 'fl oz', mlPer: 29.5735 },
  { code: 'cup', label: 'cup', mlPer: 236.588 },
  { code: 'tbsp', label: 'tbsp', mlPer: 14.7868 },
  { code: 'tsp', label: 'tsp', mlPer: 4.92892 },
]

export default function ConvertPopup({ food, onConvert }: {
  food: FoodResult
  onConvert: (amount: number) => void
}) {
  const [open, setOpen] = useState(false)
  const unitList = food.unit === 'ml' ? LIQUID_UNITS : WEIGHT_UNITS
  const [selectedCode, setSelectedCode] = useState<string>(unitList[0].code)

  const [input, setInput] = useState('')

  const n = Number(input.replace(',', '.'))

  let converted: number | null = null
  if (Number.isFinite(n) && input.trim() !== '' && n > 0) {
    if (food.unit === 'g') {
      if (selectedCode === 'lb') converted = Math.round(n * 453.592 * 100) / 100
      if (selectedCode === 'oz') converted = Math.round(n * 28.3495 * 100) / 100
      if (selectedCode === 'kg') converted = Math.round(n * 1000 * 100) / 100
    } else {
      if (selectedCode === 'fl-oz') converted = Math.round(n * 29.5735 * 100) / 100
      if (selectedCode === 'cup') converted = Math.round(n * 236.588 * 100) / 100
      if (selectedCode === 'tbsp') converted = Math.round(n * 14.7868 * 100) / 100
      if (selectedCode === 'tsp') converted = Math.round(n * 4.92892 * 100) / 100
    }
  }

  const displayedUnit = unitList.find(u => u.code === selectedCode)?.label ?? ''
  const label = food.unit === 'g' ? 'Convert from' : 'Convert from'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-link whitespace-nowrap"
        aria-label="Convert unit"
      >
        Convert
      </button>

      {open && (
        <div className="absolute z-10 top-full mt-1 bg-cream border border-line rounded-xl shadow-card p-3 space-y-2">
          <label className="block text-xs text-muted">
            {label}
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full bg-card border border-line rounded-xl text-ink px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-coral"
            >
              {unitList.map((u) => (
                <option key={u.code} value={u.code}>{u.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            Amount in {displayedUnit}
            <input
              type="text"
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0"
              className="w-full bg-card border border-line rounded-xl text-ink placeholder:text-muted px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-coral"
              onKeyDown={(e) => { if (e.key === 'Enter' && converted != null) { onConvert(converted); setOpen(false); setInput('') } }}
            />
          </label>
          {converted != null && Number.isFinite(converted) && converted > 0 && (
            <p className="text-sm text-muted">= {converted} {food.unit}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (converted != null) { onConvert(converted); setOpen(false); setInput('') }
              }}
              className="flex-1 py-1 rounded-xl bg-coral-deep hover:bg-coral-deeper text-white font-semibold text-sm disabled:opacity-50"
              disabled={converted == null || !Number.isFinite(converted) || converted <= 0}
            >
              Use
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setInput('') }}
              className="py-1 px-3 rounded-xl text-link text-sm font-semibold hover:bg-coral-light"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
