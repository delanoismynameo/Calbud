import { useId, useState } from 'react'
import { uploadPhoto } from './storage'
import { usePhotoUrl } from './usePhotoUrl'
import PhotoViewer from './PhotoViewer'

// A photo row for a form: "Add photo" opens the phone's camera or photo library; once picked, the photo is
// shrunk and uploaded right away and shown with Change and Remove. The form saves the returned path
// (and deletes the old file after it saves). `path` is the current photo's storage path, or null.
export default function PhotoField({ label, hint, path, householdId, onChange, disabled = false }: {
  label: string
  hint?: string
  path: string | null
  householdId: string | null | undefined
  onChange: (path: string | null) => void
  disabled?: boolean
}) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState(false)
  const url = usePhotoUrl(path)

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!householdId) { setError('Join or create a household first.'); return }
    setError('')
    setUploading(true)
    try {
      onChange(await uploadPhoto(householdId, file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "The photo didn't upload.")
    } finally {
      setUploading(false)
    }
  }

  const busy = uploading || disabled
  const small = 'text-sm font-semibold text-link bg-coral-light rounded-xl px-3 py-1.5 disabled:opacity-50'

  return (
    <div>
      <div className="flex items-center gap-3">
        {path ? (
          <button type="button" onClick={() => url && setViewing(true)} aria-label={`View ${label.toLowerCase()}`}
            className="h-16 w-16 shrink-0 rounded-2xl bg-cream overflow-hidden">
            {url && <img src={url} alt="" className="h-full w-full object-cover" />}
          </button>
        ) : (
          <label htmlFor={inputId} aria-hidden
            className={`h-16 w-16 shrink-0 rounded-2xl border-2 border-dashed border-line flex items-center justify-center text-2xl ${busy ? 'opacity-50' : 'cursor-pointer'}`}>
            📷
          </label>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink font-semibold">{label}</p>
          {uploading ? (
            <p className="text-xs text-muted">Uploading…</p>
          ) : path ? (
            <div className="flex gap-2 mt-1">
              <label htmlFor={inputId} className={`${small} ${busy ? 'opacity-50' : 'cursor-pointer'}`}>Change</label>
              <button type="button" onClick={() => onChange(null)} disabled={busy} className={small}>Remove</button>
            </div>
          ) : (
            <label htmlFor={inputId} className={`text-xs text-link underline ${busy ? 'opacity-50' : 'cursor-pointer'}`}>
              {hint ?? 'Take or choose a photo'}
            </label>
          )}
        </div>
        <input id={inputId} type="file" accept="image/*" onChange={pick} disabled={busy} className="sr-only" />
      </div>
      {error && <p className="text-danger text-sm mt-1">{error}</p>}
      {viewing && url && <PhotoViewer url={url} alt={label} onClose={() => setViewing(false)} />}
    </div>
  )
}
