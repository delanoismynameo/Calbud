import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useFoodSearch } from '../food/useFoodSearch'
import ServingPicker from '../food/ServingPicker'
import type { FoodResult } from '../food/types'
import { useRecentFoods } from '../food/useRecentFoods'
import { useFavoriteFoods } from '../food/useFavoriteFoods'
import { withoutFavorites } from '../food/favorites'

export default function AddFood() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  // Keep the picked food itself, not its list position: the list can refresh underneath.
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const { results, errors, isSearching, settled, failed, tooShort, refetch } = useFoodSearch(query)
  const recents = useRecentFoods()
  const favorites = useFavoriteFoods()
  const empty = query.trim() === ''

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-blue-400 hover:text-blue-300 font-semibold py-2">&larr; Back</Link>
        <h1 className="text-lg font-semibold">Add food</h1>
      </div>

      {selected ? (
        <ServingPicker food={selected} onLogged={() => navigate('/')} onCancel={() => setSelected(null)} />
      ) : (
        <>
          <input type="search" autoFocus aria-label="Search foods"
            placeholder="Search foods (e.g. banana, oatmeal)"
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" />

          {empty && !selected && (
            <div className="space-y-2">
              {recents.isPending ? null : (
                recents.isError ? (
                  <p className="text-gray-500 text-xs px-2">Couldn't load recent foods.</p>
                ) : (
                  <>
                    {favorites.isError ? (
                      <p className="text-gray-500 text-xs px-2">Couldn't load favorites.</p>
                    ) : null}

                    {favorites.data && favorites.data.length > 0 ? (
                      <>
                        <h2 className="text-sm font-semibold text-gray-400 px-1">Favorites</h2>
                        {favorites.data.map((food) => (
                          <button key={`${food.source}:${food.sourceId}`} type="button" onClick={() => setSelected(food)}
                            className="w-full bg-slate-800 rounded-lg p-3 text-left hover:bg-slate-700 active:bg-slate-600">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{food.name}</span>
                            </div>
                            {food.brand && <p className="text-gray-400 text-sm">{food.brand}</p>}
                            <p className="text-gray-400 text-xs mt-1">{Math.round(food.kcal100g)} kcal / 100 g</p>
                          </button>
                        ))}
                      </>
                    ) : null}

                    {recents.data != null && (
                      recents.data.length > 0 ? (
                        <>
                          <h2 className="text-sm font-semibold text-gray-400 px-1">Recent</h2>
                          {withoutFavorites(recents.data, favorites.data ?? []).map((food) => (
                            <button key={`${food.source}:${food.sourceId}`} type="button" onClick={() => setSelected(food)}
                              className="w-full bg-slate-800 rounded-lg p-3 text-left hover:bg-slate-700 active:bg-slate-600">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">{food.name}</span>
                              </div>
                              {food.brand && <p className="text-gray-400 text-sm">{food.brand}</p>}
                              <p className="text-gray-400 text-xs mt-1">{Math.round(food.kcal100g)} kcal / 100 g</p>
                            </button>
                          ))}
                        </>
                      ) : (
                        <>{!favorites.isPending && <p className="text-gray-400 text-center py-6">Foods you log will show up here.</p>}</>
                      )
                    )}
                  </>
                )
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
