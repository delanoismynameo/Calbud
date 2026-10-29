import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import ServingPicker from '../food/ServingPicker'
import type { FoodResult } from '../food/types'
import CustomFoodForm from '../food/CustomFoodForm'
import FoodFinder from '../food/FoodFinder'
import { validDayParam, dayTitle } from '../today/day'
import { useLocalDate } from '../lib/useLocalDate'

export default function AddFood() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = useLocalDate()
  const day = validDayParam(params.get('date'), today)
  const home = day ? `/?date=${day}` : '/'
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Link to={home} className="text-blue-400 hover:text-blue-300 font-semibold py-2">&larr; Back</Link>
        <h1 className="text-lg font-semibold">Add food{day && day !== today && <span className="text-gray-500 text-sm ml-2"> · {dayTitle(day, today)}</span>}</h1>
      </div>

      {selected ? (
        <ServingPicker food={selected} onLogged={() => navigate(home)} loggedOn={day ?? undefined} onCancel={() => setSelected(null)} />
      ) : creating && (
        <CustomFoodForm onSaved={(food) => { setCreating(false); setSelected(food) }} onCancel={() => setCreating(false)} />
      )}
      {/* Kept mounted while hidden, so the search text survives picking a food and pressing Cancel. */}
      <div className={selected || creating ? 'hidden' : 'space-y-3'}>
        <FoodFinder onPick={setSelected} onCreate={() => setCreating(true)} />
      </div>
    </div>
  )
}
