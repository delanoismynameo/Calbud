import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import ServingPicker from '../food/ServingPicker'
import type { FoodResult } from '../food/types'
import CustomFoodForm from '../food/CustomFoodForm'
import FoodFinder from '../food/FoodFinder'
import { validDayParam, dayTitle } from '../today/day'
import { useLocalDate } from '../lib/useLocalDate'
import { stepFrom, stepState, type AddFoodStep } from './addFoodStep'

export default function AddFood() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const today = useLocalDate()
  const day = validDayParam(params.get('date'), today)
  const home = day ? `/?date=${day}` : '/'
  const step = stepFrom(location.state)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  // After a reload on the food step the picked food is gone, so the search shows.
  const food = step === 'food' ? selected : null
  const creating = step === 'create'

  // A new history entry for the step, so back (the phone's or the link) returns to the
  // search. Create a food turning into its saved food replaces that entry instead.
  function openStep(next: AddFoodStep) {
    navigate({ pathname: location.pathname, search: location.search }, { state: stepState(next), replace: step !== null })
  }
  function pick(picked: FoodResult) {
    setSelected(picked)
    openStep('food')
  }
  const back = () => navigate(-1)

  return (
    <div className="bg-cream space-y-3">
      <div className="flex items-center gap-4">
        {food || creating ? (
          <button type="button" onClick={back} className="text-link underline hover:text-link font-bold py-2">&larr; Back</button>
        ) : (
          <Link to={home} className="text-link underline hover:text-link font-bold py-2">&larr; Back</Link>
        )}
        <h1 className="text-lg font-semibold text-ink">Add food{day && day !== today && <span className="text-muted text-sm ml-2"> · {dayTitle(day, today)}</span>}</h1>
      </div>

      {food ? (
        <ServingPicker food={food} onLogged={() => navigate(home, { replace: true })} loggedOn={day ?? undefined} onCancel={back} />
      ) : creating && (
        <CustomFoodForm onSaved={pick} onCancel={back} />
      )}
      {/* Kept mounted while hidden, so the search text survives picking a food and going back. */}
      <div className={food || creating ? 'hidden' : 'space-y-3'}>
        <FoodFinder onPick={pick} onCreate={() => openStep('create')} />
      </div>
    </div>
  )
}
