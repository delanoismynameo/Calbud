import { useState, useCallback, useRef } from 'react'
import { useFoodSearch } from './useFoodSearch'
import { useRecentFoods } from './useRecentFoods'
import { useFavoriteFoods } from './useFavoriteFoods'
import { withoutFavorites } from './favorites'
import { useHouseholdFoods } from './useHouseholdFoods'
import { householdMatches, matchesQuery, withoutHousehold, withSavedPhotos } from './householdFoods'
import BarcodeScanner from './BarcodeScanner'
import { normalizeBarcode } from './barcode'
import { lookupBarcode } from './off'
import { lookupUsdaBarcode } from './usda'
import { matchesBrand } from './brand'
import { usdaApiKey } from './search'
import { sourceMismatch } from './crossCheck'
import { findHouseholdFoodByBarcode } from './householdBarcode'
import { useProfile } from '../household/useProfile'
import type { FoodResult } from './types'
import FoodImage from './FoodImage'

export default function FoodFinder({ onPick, onCreate }: { onPick: (food: FoodResult) => void; onCreate?: () => void }) {
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [brandFocused, setBrandFocused] = useState(false)
  const brandInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [pickLookingUp, setPickLookingUp] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanKey, setScanKey] = useState(0)
  const { results, errors, isSearching, settled, failed, tooShort, refetch } = useFoodSearch(query, brand)
  const recents = useRecentFoods()
  const favorites = useFavoriteFoods()
  const brandTrimmed = brand.trim()
  const brandOn = brandTrimmed.length >= 2
  // The brand box sits beside the search until it's tapped or has text, then takes its own line.
  const brandOpen = brandFocused || brand !== ''
  const empty = query.trim() === '' && !brandOn
  const household = useHouseholdFoods()
  const { profile } = useProfile()
  const householdList = household.data ?? []
  // With a brand, Your foods shows only that brand's foods (and only those matching the search, if any).
  const yours = tooShort ? []
    : brandOn ? householdList.filter((f) => matchesBrand(brand, f) && (query.trim() === '' || matchesQuery(f, query))).slice(0, 8)
    : householdMatches(householdList, query)
  const usdaResults = withSavedPhotos(withoutHousehold(results, yours), householdList)
  const favoriteList = favorites.data ?? []
  // A favorite is listed once, under Favorites.
  const recentList = withoutFavorites(recents.data ?? [], favoriteList)

  // OFF search hits have no serving size, so a picked one is looked up by barcode first.
  const handlePickFood = useCallback(async (food: FoodResult) => {
    if (pickLookingUp) return

    // If OFF food without serving info, look up the full product
    if (food.source === 'off' && !food.servingG && food.barcode) {
      setPickLookingUp(true)
      try {
        const fullFood = await lookupBarcode(food.barcode)
        if (fullFood) {
          onPick(fullFood)
        } else {
          onPick(food)
        }
      } catch {
        onPick(food)
      } finally {
        setPickLookingUp(false)
      }
    } else {
      onPick(food)
    }
  }, [pickLookingUp, onPick])

  const quickPick = (food: FoodResult) => (
    <button key={`${food.source}:${food.sourceId}`} type="button" onClick={() => handlePickFood(food)}
      className="w-full bg-card rounded-3xl shadow-card p-4 text-left hover:bg-coral-light/50 active:bg-coral-light flex items-center gap-3">
      <FoodImage imageUrl={food.imageUrl} photoPath={food.photoUrl} alt={food.name} />
      <div className="flex-1">
        <span className="font-bold text-ink">{food.name}</span>
        {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
        <p className="text-sm text-muted mt-1">{Math.round(food.kcal100g)} cal / 100 {food.unit}</p>
      </div>
    </button>
  )

  const onCode = useCallback(async (text: string) => {
    if (lookingUp) return
    const code = normalizeBarcode(text)
    if (!code) { setScanError("That doesn't look like a barcode."); return }
    setLookingUp(true)
    setScanError(null)
    try {
      const saved = profile?.household_id ? await findHouseholdFoodByBarcode(profile.household_id, code) : null
      let food = saved
      if (!food) {
        const [off, usda] = await Promise.allSettled([lookupBarcode(code), lookupUsdaBarcode(code, { apiKey: usdaApiKey() })])
        const offFood = off.status === 'fulfilled' ? off.value : null
        const usdaFood = usda.status === 'fulfilled' ? usda.value : null
        if (offFood && usdaFood) {
          const warning = sourceMismatch(offFood, usdaFood)
          food = warning ? { ...offFood, crossCheck: warning } : offFood
        } else {
          food = offFood ?? usdaFood
        }
        if (!food && off.status === 'rejected') throw off.reason
      }
      if (food) { onPick(food); setScanning(false) }
      else { setScanError(`No match for ${code} in Open Food Facts or USDA. You can create it as a custom food.`) }
    } catch {
      setScanError("Couldn't look that up. Check your connection and try again.")
    } finally {
      setLookingUp(false)
    }
  }, [lookingUp, profile?.household_id])

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
          <div className="grid grid-cols-3 gap-2">
            <input type="search" autoFocus aria-label="Search foods"
              placeholder={brandOpen ? "Search foods (e.g. banana, oatmeal)" : "Search foods"}
              value={query} onChange={(e) => setQuery(e.target.value)}
              className={`${brandOpen ? 'col-span-3' : 'col-span-2'} min-w-0 w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-coral`} />
            {/* One input that changes place, so the keyboard and cursor stay put when it moves. */}
            <div className={`${brandOpen ? 'col-span-3' : 'col-span-1'} relative min-w-0`}>
              <input type="text" ref={brandInputRef} aria-label="Brand" enterKeyHint="search" autoCapitalize="none"
                placeholder={brandOpen ? 'Brand, e.g. Chobani' : 'Brand'}
                value={brand} onChange={(e) => setBrand(e.target.value)}
                onFocus={() => setBrandFocused(true)} onBlur={() => setBrandFocused(false)}
                className={`w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-coral ${brand !== '' ? 'pr-11' : ''}`} />
              {brand !== '' && (
                <button type="button" aria-label="Clear brand"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setBrand(''); brandInputRef.current?.focus() }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-muted hover:text-ink">✕</button>
              )}
            </div>
          </div>

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
          {pickLookingUp && <p className="text-sm text-muted text-center">Getting the serving size…</p>}
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
                <button key={`${food.source}:${food.sourceId}`} type="button" onClick={() => handlePickFood(food)}
                  className="w-full bg-card rounded-3xl shadow-card p-4 text-left hover:bg-coral-light/50 active:bg-coral-light flex items-center gap-3">
                  <FoodImage imageUrl={food.imageUrl} photoPath={food.photoUrl} alt={food.name} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink">{food.name}</span>
                      <span className="text-xs px-2 py-1 bg-coral-light text-link rounded-full font-medium shrink-0">{food.barcode ? 'Packaged' : 'Basic'}</span>
                    </div>
                    {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
                    <p className="text-sm text-muted mt-1">{Math.round(food.kcal100g)} cal / 100 {food.unit}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {settled && !failed && usdaResults.length === 0 && yours.length === 0 && (
            <div className="text-center py-6">
              {brandOn ? (
                <>
                  <p className="text-muted">{query.trim() ? `No ${brandTrimmed} foods match "${query.trim()}".` : `No ${brandTrimmed} foods found.`}</p>
                  <button type="button" onClick={() => setBrand('')}
                    className="mt-2 px-4 py-2 bg-coral-light hover:bg-coral-deep/10 text-link rounded-2xl text-sm font-semibold">Clear brand</button>
                </>
              ) : (
                <p className="text-muted">No foods found.</p>
              )}
            </div>
          )}

          {/* Open Food Facts' licence (ODbL) asks for a credit wherever its data shows. */}
          {!tooShort && !failed && usdaResults.length > 0 && <p className="text-xs text-muted text-center py-2">
            Food data from USDA and{' '}
            <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer"
              className="underline text-link hover:text-ink">Open Food Facts</a>
          </p>}
        </>
      )}
    </div>
  )
}
