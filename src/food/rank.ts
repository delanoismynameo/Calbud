import type { FoodResult } from './types'

export const COOKING_WORDS = ['steamed', 'boiled', 'grilled', 'baked', 'roasted', 'fried', 'broiled', 'sauteed', 'poached', 'cooked', 'raw']

export function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z]/)
    .filter(w => w.length > 0)
    .map(w => {
      if (w.length > 3 && w.endsWith('s')) {
        return w.slice(0, -1)
      }
      return w
    })
}

export function splitQuery(query: string): { core: string; methods: string[] } {
  const pieces = query.toLowerCase().trim().split(/\s+/).filter(p => p.length > 0)
  const methods: string[] = []
  const seen = new Set<string>()
  const core: string[] = []

  for (const piece of pieces) {
    if (COOKING_WORDS.includes(piece)) {
      if (!seen.has(piece)) {
        methods.push(piece)
        seen.add(piece)
      }
    } else {
      core.push(piece)
    }
  }

  if (core.length === 0) {
    return { core: query.trim().toLowerCase(), methods: [] }
  }

  return { core: core.join(' '), methods }
}

export function matchScore(food: FoodResult, query: string): number {
  const nameWords = new Set(words(food.name + ' ' + (food.brand ?? '')))
  const { core, methods } = splitQuery(query)

  let score = 0

  // +2 for each distinct word in words(core) that is in nameWords
  const coreWordSet = new Set(words(core))
  for (const w of coreWordSet) {
    if (nameWords.has(w)) {
      score += 2
    }
  }

  // +2 for each word in methods that is in nameWords
  for (const m of methods) {
    if (nameWords.has(m)) {
      score += 2
    }
  }

  // +1 bonus: methods not empty, none matched, methods doesn't include 'raw', nameWords has 'cooked'
  if (methods.length > 0
    && !methods.some(m => nameWords.has(m))
    && !methods.includes('raw')
    && nameWords.has('cooked')) {
    score += 1
  }

  return score
}

export function rankResults(results: FoodResult[], query: string): FoodResult[] {
  const scored = results.map((r, i) => ({ r, i, score: matchScore(r, query) }))
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.i - b.i // stable sort: ties keep input order
  })
  return scored.map(s => s.r)
}
