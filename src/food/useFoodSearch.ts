import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { FoodResult } from './types'
import { searchFoods, usdaApiKey } from './search'
import { useDebouncedValue } from '../lib/useDebouncedValue'

type QueryResult = { results: FoodResult[]; errors: string[] }

export function useFoodSearch(query: string) {
  const trimmed = query.trim()
  const debounced = useDebouncedValue(trimmed, 400)
  const tooShort = trimmed.length < 2

  const result = useQuery<QueryResult>({
    queryKey: ['food-search', debounced],
    queryFn: ({ signal }) => searchFoods(debounced, { apiKey: usdaApiKey(), signal }),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  })

  const failed = result.isError && (result.error instanceof Error)
    ? result.error.message
    : null

  return {
    results: (result.data ?? { results: [] as FoodResult[], errors: [] }).results,
    errors: (result.data ?? { results: [] as FoodResult[], errors: [] }).errors,
    isSearching: result.isFetching,
    // True once the current debounced query has finished loading (used for "No foods found.").
    settled: !tooShort && debounced === trimmed && result.isSuccess && !result.isFetching && !result.isPlaceholderData,
    failed,
    tooShort,
    refetch: result.refetch,
  }
}
