import { useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useFoodSearch } from '../food/useFoodSearch'
import ServingPicker from '../food/ServingPicker'
import type { FoodResult } from '../food/types'
import { useRecentFoods } from '../food/useRecentFoods'
import { useFavoriteFoods } from '../food/useFavoriteFoods'
import { withoutFavorites } from '../food/favorites'
import CustomFoodForm from '../food/CustomFoodForm'
import BarcodeScanner from '../food/BarcodeScanner'
import { normalizeBarcode } from '../food/barcode'
import { lookupBarcode } from '../food/off'
import { validDayParam, dayTitle } from '../today/day'
import { useLocalDate } from '../lib/useLocalDate'

export default function AddFood() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const today = useLocalDate()
  const day = validDayParam(params.get('date'), today)
  const home = day ? `/?date=${day}` : '/'
  const [query, setQuery] = useState('')
  // Keep the picked food itself, not its list position: the list can refresh underneath.
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  // The camera stops after each read; a new key restarts it.
  const [scanKey, setScanKey] = useState(0)
  const { results, errors, isSearching, settled, failed, tooShort, refetch } = useFoodSearch(query)
  const recents = useRecentFoods()
  const favorites = useFavoriteFoods()
  const empty = query.trim() === ''
  const favoriteList = favorites.data ?? []
  // A favorite is listed once, under Favorites.
  const recentList = withoutFavorites(recents.data ?? [], favoriteList)
  const quickPick = (food: FoodResult) => (
    <button key={`${food.source}:${food.sourceId}`} type="button" onClick={() => setSelected(food)}
      className="w-full bg-slate-800 rounded-lg p-3 text-left hover:bg-slate-700 active:bg-slate-600">
      <span className="font-semibold">{food.name}</span>
      {food.brand && <p className="text-gray-400 text-sm">{food.brand}</p>}
      <p className="text-gray-400 text-xs mt-1">{Math.round(food.kcal100g)} kcal / 100 g</p>
    </button>
  )

  const onCode = useCallback(async (text: string) => {
    if (lookingUp) return
    const code = normalizeBarcode(text)
    if (!code) { setScanError("That doesn't look like a barcode."); return }
    setLookingUp(true)
    setScanError(null)
    try {
      const food = await lookupBarcode(code)
      if (food) { setSelected(food); setScanning(false) }
      else { setScanError(`No match for ${code} in Open Food Facts. You can create it as a custom food.`) }
    } catch {
      setScanError("Couldn't look that up. Check your connection and try again.")
    } finally {
      setLookingUp(false)
    }
  }, [lookingUp])

  const onScannerCancel = useCallback(() => {
    setScanning(false)
    setScanError(null)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Link to={home} className="text-blue-400 hover:text-blue-300 font-semibold py-2">&larr; Back</Link>
        <h1 className="text-lg font-semibold">Add food{day && day !== today && <span className="text-gray-500 text-sm ml-2"> · {dayTitle(day, today)}</span>}</h1>
      </div>

      {selected ? (
        <ServingPicker food={selected} onLogged={() => navigate(home)} loggedOn={day ?? undefined} onCancel={() => setSelected(null)} />
      ) : creating ? (
        <CustomFoodForm onSaved={(food) => { setCreating(false); setSelected(food) }} onCancel={() => setCreating(false)} />
      ) : scanning ? (
        <div className="space-y-3">
          <BarcodeScanner key={scanKey} onCode={onCode} onCancel={onScannerCancel} />
          {lookingUp && <p className="text-blue-400 text-sm text-center">Looking up…</p>}
          {scanError && (
            <div className="space-y-2">
              <p className="text-red-400 text-sm">{scanError}</p>
              <button type="button" onClick={() => { setScanError(null); setScanKey((k) => k + 1) }}
                className="w-full py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800">Scan again</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <input type="search" autoFocus aria-label="Search foods"
            placeholder="Search foods (e.g. banana, oatmeal)"
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" />

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setScanning(true); setScanError(null) }}
              className="py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800">Scan a barcode</button>
            <button type="button" onClick={() => setCreating(true)}
              className="py-2 rounded border border-dashed border-slate-600 text-gray-300 hover:bg-slate-800">+ Create a food</button>
          </div>

          {empty && (
            <div className="space-y-2">
              {favorites.isError && <p className="text-gray-500 text-xs px-2">Couldn't load favorites.</p>}
              {recents.isError && <p className="text-gray-500 text-xs px-2">Couldn't load recent foods.</p>}
              {favoriteList.length > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-400 px-1">Favorites</h2>
                  {favoriteList.map(quickPick)}
                </>
              )}
              {recentList.length > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-400 px-1">Recent</h2>
                  {recentList.map(quickPick)}
                </>
              )}
              {recents.isSuccess && favorites.isSuccess && favoriteList.length === 0 && recentList.length === 0 && (
                <p className="text-gray-400 text-center py-6">Foods you log will show up here.</p>
              )}
            </div>
          )}

          {tooShort && !empty && <p className="text-gray-400 text-center py-4">Type at least 2 letters.</p>}
          {!tooShort && isSearching && <p className="text-sm text-blue-400 text-center">Searching…</p>}
          {!tooShort && failed && (
            <div className="bg-slate-800 rounded p-3 text-center space-y-2">
              <p className="text-red-400">{failed}</p>
              <button type="button" onClick={() => refetch()} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded font-semibold text-white">Try again</button>
            </div>
          )}
          {!tooShort && errors.map((e) => <p key={e} className="text-gray-500 text-xs px-2">{e}</p>)}

          {!tooShort && !failed && results.length > 0 && (
            <div className="space-y-2 pb-4">
              {results.map((food) => (
                <button key={`${food.source}:${food.sourceId}`} type="button" onClick={() => setSelected(food)}
                  className="w-full bg-slate-800 rounded-lg p-3 text-left hover:bg-slate-700 active:bg-slate-600">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{food.name}</span>
                    <span className="text-xs px-2 py-1 bg-slate-900 rounded text-gray-400 shrink-0">{food.barcode ? 'Packaged' : 'Basic'}</span>
                  </div>
                  {food.brand && <p className="text-gray-400 text-sm">{food.brand}</p>}
                  <p className="text-gray-400 text-xs mt-1">{Math.round(food.kcal100g)} kcal / 100 g</p>
                </button>
              ))}
            </div>
          )}
          {settled && !failed && results.length === 0 && <p className="text-gray-400 text-center py-6">No foods found.</p>}
        </>
      )}
    </div>
  )
}
