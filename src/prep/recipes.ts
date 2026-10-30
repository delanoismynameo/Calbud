import type { Ingredient, MealPrep } from './types'

export interface Recipe {
  key: string            // title trimmed and lower-cased
  title: string          // the title as written on the newest session
  sessions: number       // all sessions with this title
  made: number           // sessions with status 'done'
  lastDate: string       // newest scheduled_date, 'YYYY-MM-DD'
  servings: number
  ingredients: Ingredient[]
  notes: string | null
  recipeUrl: string | null
}

/** Compare by (scheduled_date, created_at) for ordering. */
function dateKey(p: MealPrep): [string, number] {
  return [p.scheduled_date, new Date(p.created_at).getTime()] as const
}

export function recipesFrom(preps: MealPrep[]): Recipe[] {
  interface Group {
    sessions: number
    made: number
    lastDate: string
    title: string
    servings: number
    ingredients: Ingredient[]
    notes: string | null
    recipeUrl: string | null
    newestKey: [string, number]
  }

  const groups = new Map<string, Group>()

  for (const prep of preps) {
    const trimmed = prep.title.trim()
    if (trimmed === '') continue
    const key = trimmed.toLowerCase()

    let g = groups.get(key)
    if (!g) {
      g = { sessions: 0, made: 0, lastDate: '', title: '', servings: 0, ingredients: [], notes: null, recipeUrl: null, newestKey: ['', 0] }
      groups.set(key, g)
    }

    g.sessions++
    if (prep.status === 'done') g.made++
    if (prep.scheduled_date > g.lastDate) g.lastDate = prep.scheduled_date

    const newKey = dateKey(prep)
    let isNewer = false
    if (newKey[0] > g.newestKey[0]) {
      isNewer = true
    } else if (newKey[0] === g.newestKey[0] && newKey[1] > g.newestKey[1]) {
      isNewer = true
    }

    if (isNewer) {
      g.newestKey = newKey
      g.title = trimmed
      g.servings = prep.servings
      g.ingredients = prep.ingredients ?? []
      g.notes = prep.notes ?? null
      if (prep.recipe_url != null) {
        g.recipeUrl = prep.recipe_url
      }
    } else if (prep.recipe_url != null && g.recipeUrl == null) {
      // First non-null url encountered from an older session
      g.recipeUrl = prep.recipe_url
    }
  }

  const result: Recipe[] = []
  for (const key of groups.keys()) {
    const g = groups.get(key)!
    result.push({
      key,
      title: g.title,
      sessions: g.sessions,
      made: g.made,
      lastDate: g.lastDate,
      servings: g.servings,
      ingredients: g.ingredients,
      notes: g.notes,
      recipeUrl: g.recipeUrl,
    })
  }

  result.sort((a, b) => {
    const dateCmp = b.lastDate.localeCompare(a.lastDate)
    if (dateCmp !== 0) return dateCmp
    return a.title.localeCompare(b.title, 'en')
  })

  return result
}
