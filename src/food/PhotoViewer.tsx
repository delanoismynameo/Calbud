import { useEffect } from 'react'

// A photo shown full screen (a recipe page to read while cooking). Tap anywhere or press Escape to close.
export default function PhotoViewer({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3">
      <img src={url} alt={alt} className="max-h-full max-w-full object-contain rounded-lg" />
      <button type="button" onClick={onClose} aria-label="Close photo"
        className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/15 text-white text-xl">✕</button>
    </div>
  )
}
