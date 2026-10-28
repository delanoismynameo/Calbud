import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useFoodSearch } from '../food/useFoodSearch'
import ServingPicker from '../food/ServingPicker'

export default function AddFood() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const { results, errors, isSearching, failed, tooShort, refetch } = useFoodSearch(query)

  useEffect(() => { setSelected(null) }, [query])

  if (selected != null) {
    return <ServingPicker food={results[selected]} onDone={() => setSelected(null)} />
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-10 bg-slate-800 px-4 py-3 flex items-center gap-4 border-b border-slate-700">
        <Link to="/" className="text-blue-400 hover:text-blue-300 font-semibold">&larr; Back</Link>
        <h1 className="text-lg font-semibold">Add food</h1>
      </header>

      <div className="px-4 py-3">
        <input type="search" autoFocus
          placeholder="Search foods (e.g. banana, oatmeal)"
          value={query} onChange={(e) => { setQuery(e.target.value) }}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500" />
      </div>

      <div className="px-4 pb-20 space-y-2">
        {tooShort && <p className="text-gray-400 text-center py-4">Type at least 2 letters.</p>}
        {!tooShort && isSearching && (
          <p className="text-sm text-blue-400 text-center py-2 animate-pulse">Searching&hellip;</p>
        )}
        {failed && (
          <div className="bg-slate-800 rounded p-3 text-center space-y-2">
            <p className="text-red-400">{failed}</p>
            <button onClick={() => refetch()} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded font-semibold text-white">Try again</button>
          </div>
        )}
        {errors.map((e) => (
          <p key={e} className="text-gray-500 text-xs px-2">{e}</p>
        ))}

        {!failed && results.length > 0 ? (
          <div className="space-y-2">
            {results.map((food, i) => (
              <button key={food.sourceId} onClick={() => setSelected(i)}
                className="w-full bg-slate-800 rounded-lg p-3 text-left hover:bg-slate-700 active:bg-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{food.name}</span>
                  <span className="text-xs px-2 py-1 bg-slate-900 rounded text-gray-400">{food.source === 'usda' ? 'USDA' : 'OFF'}</span>
                </div>
                {food.brand != null && <p className="text-gray-400 text-sm">{food.brand}</p>}
                <p className="text-gray-400 text-xs mt-1">{food.kcal100g} kcal / 100 g</p>
              </button>
            ))}
          </div>
        ) : !failed && (isSearching || results.length === 0) ? (
          <p className="text-gray-400 text-center py-6">{results.length === 0 ? 'No foods found.' : ''}</p>
        ) : null}
      </div>
    </div>
  )
}
