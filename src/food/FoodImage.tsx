import { useState, type ReactNode } from 'react'
import { usePhotoUrl } from './usePhotoUrl'

// A food's photo: the household's own photo (photoPath, in Storage) first, else the package photo (imageUrl,
// from Open Food Facts). Shows `fallback` (nothing by default) when there is neither, while your photo's link loads
// with no package photo to show, or when the image fails to load.
export default function FoodImage({ imageUrl, photoPath, alt = '', className = 'w-12 h-12 rounded-lg', fallback = null }: {
  imageUrl?: string | null
  photoPath?: string | null
  alt?: string
  className?: string
  fallback?: ReactNode
}) {
  const signed = usePhotoUrl(photoPath)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const src = signed ?? imageUrl ?? null
  if (!src || src === failedSrc) return <>{fallback}</>
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={`${className} object-cover shrink-0 bg-cream`}
    />
  )
}
