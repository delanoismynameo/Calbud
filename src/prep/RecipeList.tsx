import { useState, useEffect, useRef } from 'react'
import { useAllPreps } from './useAllPreps'
import { recipesFrom } from './recipes'
import { dayLabel } from './week'
import { formatGroceryItem } from './grocery'
import type { GroceryItem } from './grocery'
import { loadExtras, mergeExtras, saveExtras } from './extras'

export default function RecipeList({ weekStart }: { weekStart: string }) {
  const { data, isLoading, error, refetch } = useAllPreps()
  const [search, setSearch] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [addedKey, setAddedKey] = useState<string | null>(null)
  const prevOpenRef = useRef<string | null>(null)

  useEffect(() => {
    if (openKey !== prevOpenRef.current) {
      setAddedKey(null)
      prevOpenRef.current = openKey
    }
  }, [openKey])

  const recipes = data ? recipesFrom(data) : []

  const filtered = search === ''
    ? recipes
    : recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))

  const anyMatch = filtered.length > 0

  return (
    <div className="px-3 py-4">
      {isLoading && <p className="px-3 py-8 text-center text-muted">Loading…</p>}
      {error && !isLoading && (
        <div className="px-3 py-6 text-center space-y-2">
          <p className="text-danger">{error.message}</p>
          <button onClick={() => refetch()} className="text-sm text-link underline">Try again</button>
        </div>
      )}

      {data && !isLoading && !error && recipes.length === 0 && (
        <p className="px-3 py-6 text-center text-muted">No recipes yet. Add a dish on the Plan tab.</p>
      )}

      {!isLoading && (
        <div className="px-3 mb-3">
          <input
            type="search"
            placeholder="Search recipes"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral w-full"
          />
        </div>
      )}

      {!anyMatch && recipes.length > 0 && !isLoading && data && (
        <p className="px-3 pt-2 text-center text-muted">No recipe matches that.</p>
      )}

      {data && anyMatch && (
        <div className="space-y-3">
          {filtered.map(r => {
            const isOpen = openKey === r.key
            return (
              <div key={r.key} className="bg-card rounded-3xl shadow-card p-4">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenKey(isOpen ? null : r.key)}
                  className="w-full text-left"
                >
                  <p className="font-bold text-ink">{r.title}</p>
                  <p className="text-[13px] text-muted">
                    {r.made > 0 ? `Made ${r.made}×` : 'Not made yet'}
                    {' · last '}
                    {dayLabel(r.lastDate)}
                  </p>
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>{r.servings} serving(s)</p>

                    {r.ingredients.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5">
                        {r.ingredients.map((ing, i) => (
                          <li key={i}>{formatGroceryItem(ing)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted">No ingredients saved.</p>
                    )}

                    {r.ingredients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          saveExtras(weekStart, mergeExtras(loadExtras(weekStart), r.ingredients as GroceryItem[]))
                          setAddedKey(r.key)
                        }}
                        disabled={addedKey === r.key}
                        className={`mt-1 bg-coral-light text-link rounded-2xl font-semibold px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {addedKey === r.key ? "Added to this week's list" : 'Add to grocery list'}
                      </button>
                    )}

                    {r.notes && <p className="text-muted">{r.notes}</p>}

                    {r.recipeUrl && (
                      <a href={r.recipeUrl} target="_blank" rel="noopener noreferrer" className="text-link underline">Open recipe</a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
