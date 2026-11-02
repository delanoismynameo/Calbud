import { useState } from 'react'

export default function FoodImage({ imageUrl, alt = '' }: { imageUrl: string | null | undefined; alt?: string }) {
  const [failed, setFailed] = useState(false)
  if (!imageUrl || failed) return null
  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-cream"
    />
  )
}
