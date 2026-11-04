import { useQuery } from '@tanstack/react-query'
import { isPhotoPath, signedPhotoUrl, SIGNED_URL_SECONDS } from './storage'

// A signed link for a household photo path, or null while it loads, when there is none, or when it fails.
// The link lasts an hour; the query refetches it before then, so a page left open keeps showing the photo.
export function usePhotoUrl(path: string | null | undefined): string | null {
  const valid = isPhotoPath(path)
  const { data } = useQuery({
    queryKey: ['photo-url', path],
    queryFn: () => signedPhotoUrl(path ?? ''),
    enabled: valid,
    staleTime: (SIGNED_URL_SECONDS - 10 * 60) * 1000,
    refetchInterval: (SIGNED_URL_SECONDS - 10 * 60) * 1000,
    gcTime: (SIGNED_URL_SECONDS - 10 * 60) * 1000,
    retry: 1,
  })
  return valid ? data ?? null : null
}
