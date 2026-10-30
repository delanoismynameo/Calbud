import { useState, useCallback } from 'react'
import { useFoodSearch } from './useFoodSearch'
import { useRecentFoods } from './useRecentFoods'
import { useFavoriteFoods } from './useFavoriteFoods'
import { withoutFavorites } from './favorites'
import { useHouseholdFoods } from './useHouseholdFoods'
import { householdMatches, withoutHousehold } from './householdFoods'
import BarcodeScanner from './BarcodeScanner'
import { normalizeBarcode } from './barcode'
import { lookupBarcode } from './off'
import type { FoodResult } from './types'

export default function FoodFinder({ onPick, onCreate }: { onPick: (food: FoodResult) => void; onCreate?: () => void }) {
  const [query, setQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanKey, setScanKey] = useState(0)
  const { results, errors, isSearching, settled, failed, tooShort, refetch } = useFoodSearch(query)
  const recents = useRecentFoods()
  const favorites = useFavoriteFoods()
  const empty = query.trim() === ''
  const household = useHouseholdFoods()
  const yours = tooShort || empty ? [] : householdMatches(household.data ?? [], query)
  const usdaResults = withoutHousehold(results, yours)
  const favoriteList = favorites.data ?? []
  // A favorite is listed once, under Favorites.
  const recentList = withoutFavorites(recents.data ?? [], favoriteList)
  const quickPick = (food: FoodResult) => (
    <button key={`${food.source}:${food.sourceId}`} type="button" onClick={() => onPick(food)}
      className="w-full bg-card rounded-3xl shadow-card p-4 text-left hover:bg-coral-light/50 active:bg-coral-light">
      <span className="font-bold text-ink">{food.name}</span>
      {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
      <p className="text-sm text-muted mt-1">{Math.round(food.kcal100g)} cal / 100 g</p>
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
      if (food) { onPick(food); setScanning(false) }
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
      {scanning ? (
        <div className="space-y-3">
          <BarcodeScanner key={scanKey} onCode={onCode} onCancel={onScannerCancel} />
          {lookingUp && <p className="text-muted text-sm text-center">Looking up…</p>}
          {scanError && (
            <div className="space-y-2">
              <p className="text-danger text-sm">{scanError}</p>
              <button type="button" onClick={() => { setScanError(null); setScanKey((k) => k + 1) }}
                className="w-full py-3 bg-card border border-line rounded-2xl text-muted font-semibold text-center hover:bg-coral-light/50 active:bg-coral-light">Scan again</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <input type="search" autoFocus aria-label="Search foods"
            placeholder="Search foods (e.g. banana, oatmeal)"
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-coral" />

          <div className={`grid ${onCreate ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
            <button type="button" onClick={() => { setScanning(true); setScanError(null) }}
              className="w-full py-3 bg-card border border-line rounded-2xl text-muted font-semibold text-center hover:bg-coral-light/50 active:bg-coral-light">Scan a barcode</button>
            {onCreate && (
              <button type="button" onClick={onCreate}
                className="w-full py-3 bg-card border border-line rounded-2xl text-muted font-semibold text-center hover:bg-coral-light/50 active:bg-coral-light">+ Create a food</button>
            )}
          </div>

          {yours.length > 0 && (
            <>
              <h2 className="text-[13px] font-bold uppercase tracking-[1.5px] text-section px-1">Your foods</h2>
              {yours.map(quickPick)}
            </>
          )}

          {empty && (
            <div className="space-y-2">
              {favorites.isError && <p className="text-muted text-xs px-2">Couldn't load favorites.</p>}
              {recents.isError && <p className="text-muted text-xs px-2">Couldn't load recent foods.</p>}
              {favoriteList.length > 0 && (
                <>
                  <h2 className="text-[13px] font-bold uppercase tracking-[1.5px] text-section px-1">Favorites</h2>
                  {favoriteList.map(quickPick)}
                </>
              )}
              {recentList.length > 0 && (
                <>
                  <h2 className="text-[13px] font-bold uppercase tracking-[1.5px] text-section px-1">Recent</h2>
                  {recentList.map(quickPick)}
                </>
              )}
              {recents.isSuccess && favorites.isSuccess && favoriteList.length === 0 && recentList.length === 0 && (
                <p className="text-muted text-center py-6">Foods you log will show up here.</p>
              )}
            </div>
          )}

          {tooShort && !empty && <p className="text-muted text-center py-4">Type at least 2 letters.</p>}
          {!tooShort && isSearching && <p className="text-sm text-muted text-center">Searching…</p>}
          {!tooShort && failed && (
            <div className="bg-card rounded-3xl shadow-card p-4 text-center space-y-2">
              <p className="text-danger">{failed}</p>
              <button type="button" onClick={() => refetch()} className="py-3 px-6 bg-coral-deep hover:bg-coral-deeper rounded-2xl font-bold text-white">Try again</button>
            </div>
          )}
          {!tooShort && errors.map((e) => <p key={e} className="text-muted text-xs px-2">{e}</p>)}

          {!tooShort && !failed && usdaResults.length > 0 && (
            <div className="space-y-2 pb-4">
              {usdaResults.map((food) => (
                <button key={`${food.source}:${food.sourceId}`} type="button" onClick={() => onPick(food)}
                  className="w-full bg-card rounded-3xl shadow-card p-4 text-left hover:bg-coral-light/50 active:bg-coral-light">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">{food.name}</span>
                    <span className="text-xs px-2 py-1 bg-coral-light text-coral-deep rounded-full font-medium shrink-0">{food.barcode ? 'Packaged' : 'Basic'}</span>
                  </div>
                  {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
                  <p className="text-sm text-muted mt-1">{Math.round(food.kcal100g)} cal / 100 g</p>
                </button>
              ))}
            </div>
          )}
          {settled && !failed && usdaResults.length === 0 && yours.length === 0 && <p className="text-muted text-center py-6">No foods found.</p>}
        </>
      )}
    </div>
  )
}
